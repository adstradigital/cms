from __future__ import annotations

from typing import Dict, Optional

from apps.accounts.models import AcademicYear
from apps.students.models import Section

from .access.classes import (
    ensure_class_teacher_first_period_support,
    ensure_subject_allocations,
    get_school_active_academic_year,
    get_section,
)
from .actions import apply_timetable_preview, create_ai_brain_draft, save_timetable_draft
from .automation.at_risk_detector import AtRiskDetector
from .automation.report_card_builder import ReportCardBuilder
from .automation.timetable_generator import TimetableConstraintValidator, TimetableDraftGenerator
from .data_context import get_database_inventory
from .models import AIBrainDraft
from .permissions import has_ai_brain_access


class AIBrainEngine:
    """
    Central entry point for all AI-brain capabilities.
    """

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

    def run_timetable_validation(
        self,
        *,
        section: Section,
        academic_year: AcademicYear,
        periods_per_day: int,
        break_periods,
        working_days,
    ) -> Dict:
        validator = TimetableConstraintValidator(section=section, academic_year=academic_year)
        return validator.validate_existing(
            periods_per_day=periods_per_day,
            break_periods=break_periods,
            working_days=working_days,
        )

    def run_timetable_generation(
        self,
        *,
        section: Section,
        academic_year: AcademicYear,
        config: Dict,
        requested_by,
        persist: bool = False,
    ) -> Dict:
        allocation_sync = ensure_subject_allocations(section=section, academic_year=academic_year)
        if not allocation_sync.get("success"):
            return allocation_sync

        preferences = config.get("preferences") or {}
        class_teacher_sync = None
        if preferences.get("class_teacher_first_period"):
            class_teacher_sync = ensure_class_teacher_first_period_support(
                section=section,
                academic_year=academic_year,
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

    def run_report_card_builder(self, *, student_id: int, exam_id: int, persist: bool = False) -> Dict:
        return self.report_card_builder.build_student_report_card_payload(
            student_id=student_id,
            exam_id=exam_id,
            persist=persist,
        )

    def run_report_card_builder_for_section(
        self,
        *,
        section_id: int,
        exam_id: int,
        persist: bool = True,
    ) -> Dict:
        return self.report_card_builder.build_section_report_cards(
            section_id=section_id,
            exam_id=exam_id,
            persist=persist,
        )

    def run_at_risk_detector(
        self,
        *,
        section_id: int,
        exam_id: int,
        min_attendance_pct: float = 75.0,
        min_marks_pct: float = 40.0,
    ) -> Dict:
        return self.at_risk_detector.detect_section_risks(
            section_id=section_id,
            exam_id=exam_id,
            min_attendance_pct=min_attendance_pct,
            min_marks_pct=min_marks_pct,
        )

    def apply_timetable_draft(self, *, draft_id: int, actor, manual_override_payload: Optional[Dict] = None) -> Dict:
        draft = AIBrainDraft.objects.filter(id=draft_id, draft_type="timetable").first()
        if not draft:
            return {"success": False, "error": "Timetable draft not found."}
        allowed, reason = has_ai_brain_access(actor, section=draft.section)
        if not allowed:
            return {"success": False, "error": reason}
        return apply_timetable_preview(draft=draft, actor=actor, manual_override_payload=manual_override_payload)

    def get_data_inventory(self) -> Dict:
        return get_database_inventory()

    @staticmethod
    def _resolve_academic_year(section: Section, academic_year_id: Optional[int] = None):
        if academic_year_id:
            return AcademicYear.objects.filter(id=academic_year_id).first()
        return get_school_active_academic_year(section.school_class.school_id)
