from __future__ import annotations

from typing import Dict, List, Optional

from apps.accounts.models import AcademicYear
from apps.students.models import Section

from .access.classes import (
    ensure_class_teacher_first_period_support,
    ensure_subject_allocations,
    get_school_active_academic_year,
    get_section,
)
from .actions import (
    apply_timetable_preview,
    create_ai_brain_draft,
    resolve_at_risk_record,
    rollback_timetable_draft,
    save_at_risk_records,
    save_timetable_draft,
)
from .automation.at_risk_detector import AtRiskDetector
from .automation.report_card_builder import ReportCardBuilder
from .automation.timetable_generator import TimetableConstraintValidator, TimetableDraftGenerator
from .data_context import get_database_inventory
from .models import AIBrainDraft, AtRiskRecord
from .permissions import has_ai_brain_access


class AIBrainEngine:
    def __init__(self):
        self.report_card_builder = ReportCardBuilder()
        self.at_risk_detector = AtRiskDetector()

    def resolve_context(self, section_id: int, academic_year_id: Optional[int] = None):
        section = get_section(section_id)
        if not section:
            return None, None, {"success": False, "error": "Section not found."}

        academic_year = self._resolve_academic_year(section=section, academic_year_id=academic_year_id)
        if not academic_year:
            return section, None, {"success": False, "error": "Academic year not found."}

        return section, academic_year, None

    def run_timetable_validation(self, *, section, academic_year, periods_per_day, break_periods, working_days) -> Dict:
        validator = TimetableConstraintValidator(section=section, academic_year=academic_year)
        return validator.validate_existing(
            periods_per_day=periods_per_day,
            break_periods=break_periods,
            working_days=working_days,
        )

    def run_timetable_generation(self, *, section, academic_year, config, requested_by, persist=False) -> Dict:
        allocation_sync = ensure_subject_allocations(section=section, academic_year=academic_year)
        if not allocation_sync.get("success"):
            return allocation_sync

        preferences = config.get("preferences") or {}
        class_teacher_sync = None
        if preferences.get("class_teacher_first_period"):
            class_teacher_sync = ensure_class_teacher_first_period_support(
                section=section, academic_year=academic_year
            )
            if not class_teacher_sync.get("success"):
                return class_teacher_sync

        generator = TimetableDraftGenerator(section=section, academic_year=academic_year, config=config)
        result = generator.generate()
        has_draft_rows = bool(result.get("draft"))
        if not result.get("success") and not has_draft_rows:
            return result
        if not result.get("success") and has_draft_rows:
            result["is_partial"] = True
            result["success"] = True
        result["allocation_sync"] = allocation_sync
        if class_teacher_sync is not None:
            result["class_teacher_sync"] = class_teacher_sync

        draft = create_ai_brain_draft(
            draft_type="timetable",
            school=section.school_class.school,
            section=section,
            requested_by=requested_by,
            input_payload={**config, "academic_year_id": academic_year.id},
            output_payload=result,
        )
        result["draft_id"] = draft.id

        if persist:
            save_meta = save_timetable_draft(
                section=section,
                academic_year=academic_year,
                draft_rows=result.get("draft", []),
                periods_per_day=int(config.get("periods_per_day") or 8),
                break_periods=config.get("break_periods") or [4],
            )
            result["save_meta"] = save_meta
            draft.status = "applied"
            draft.is_applied = True
            draft.save(update_fields=["status", "is_applied", "updated_at"])
        return result

    def run_report_card_builder(self, *, student_id: int, exam_id: int, persist=False) -> Dict:
        return self.report_card_builder.build_student_report_card_payload(
            student_id=student_id, exam_id=exam_id, persist=persist
        )

    def run_report_card_builder_for_section(self, *, section_id: int, exam_id: int, persist=True) -> Dict:
        return self.report_card_builder.build_section_report_cards(
            section_id=section_id, exam_id=exam_id, persist=persist
        )

    def run_at_risk_detector(
        self,
        *,
        section_id: int,
        exam_id: int,
        min_attendance_pct: float = 75.0,
        min_marks_pct: float = 40.0,
        persist: bool = False,
        actor=None,
    ) -> Dict:
        result = self.at_risk_detector.detect_section_risks(
            section_id=section_id,
            exam_id=exam_id,
            min_attendance_pct=min_attendance_pct,
            min_marks_pct=min_marks_pct,
        )
        if persist and result.get("success") and result.get("flagged_students"):
            section = get_section(section_id)
            from apps.exams.models import Exam
            exam = Exam.objects.filter(id=exam_id).first()
            school = section.school_class.school if section else None
            persist_result = save_at_risk_records(
                flagged_students=result["flagged_students"],
                section=section,
                school=school,
                exam=exam,
                actor=actor,
            )
            result["persisted"] = persist_result
        return result

    def run_school_at_risk_sweep(
        self,
        *,
        school_id: int,
        exam_id: int,
        min_attendance_pct: float = 75.0,
        min_marks_pct: float = 40.0,
        actor=None,
    ) -> Dict:
        from apps.students.models import Section as SectionModel
        from apps.exams.models import Exam
        from apps.accounts.models import School

        school = School.objects.filter(id=school_id).first()
        if not school:
            return {"success": False, "error": "School not found."}

        exam = Exam.objects.filter(id=exam_id).first()
        if not exam:
            return {"success": False, "error": "Exam not found."}

        sections = SectionModel.objects.filter(school_class__school_id=school_id)
        total_flagged = 0
        sections_swept = 0

        for section in sections:
            result = self.at_risk_detector.detect_section_risks(
                section_id=section.id,
                exam_id=exam_id,
                min_attendance_pct=min_attendance_pct,
                min_marks_pct=min_marks_pct,
            )
            flagged = result.get("flagged_students", [])
            if flagged:
                save_at_risk_records(
                    flagged_students=flagged,
                    section=section,
                    school=school,
                    exam=exam,
                    actor=actor,
                )
                total_flagged += len(flagged)
            sections_swept += 1

        return {
            "success": True,
            "school_id": school_id,
            "exam_id": exam_id,
            "sections_swept": sections_swept,
            "total_flagged": total_flagged,
        }

    def resolve_at_risk(self, *, record_id: int, actor) -> Dict:
        record = AtRiskRecord.objects.filter(id=record_id).first()
        if not record:
            return {"success": False, "error": "At-risk record not found."}
        if record.resolved:
            return {"success": False, "error": "Record already resolved."}
        return resolve_at_risk_record(record=record, actor=actor)

    def apply_timetable_draft(self, *, draft_id: int, actor, manual_override_payload=None) -> Dict:
        draft = AIBrainDraft.objects.filter(id=draft_id, draft_type="timetable").first()
        if not draft:
            return {"success": False, "error": "Timetable draft not found."}
        allowed, reason = has_ai_brain_access(actor, section=draft.section)
        if not allowed:
            return {"success": False, "error": reason}
        return apply_timetable_preview(draft=draft, actor=actor, manual_override_payload=manual_override_payload)

    def rollback_timetable(self, *, draft_id: int, actor) -> Dict:
        draft = AIBrainDraft.objects.filter(id=draft_id, draft_type="timetable").first()
        if not draft:
            return {"success": False, "error": "Timetable draft not found."}
        allowed, reason = has_ai_brain_access(actor, section=draft.section)
        if not allowed:
            return {"success": False, "error": reason}
        return rollback_timetable_draft(draft=draft, actor=actor)

    def get_data_inventory(self, *, school_id=None, academic_year_id=None, include_models=True, include_entity_counts=True) -> Dict:
        return get_database_inventory(
            school_id=school_id,
            academic_year_id=academic_year_id,
            include_models=include_models,
            include_entity_counts=include_entity_counts,
        )

    @staticmethod
    def _resolve_academic_year(section, academic_year_id=None):
        if academic_year_id:
            return AcademicYear.objects.filter(id=academic_year_id).first()
        return get_school_active_academic_year(section.school_class.school_id)
