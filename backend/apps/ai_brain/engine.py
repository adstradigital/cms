from __future__ import annotations


from typing import Dict, Optional, Callable, Any,List




from apps.accounts.models import AcademicYear
from apps.students.models import Section

from .analytics.scoring import (
    confidence_from_success,
    score_timetable_generation,
    score_timetable_validation,
)
from .analytics.teacher_load import TeacherLoadAnalyzer
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

from .llm import merge_constraint_preferences

from .models import AIBrainDraft, AtRiskRecord
from .permissions import has_ai_brain_access
from .result import AIBrainResult


class AIBrainEngine:
    def __init__(self):
        self.report_card_builder = ReportCardBuilder()
        self.at_risk_detector = AtRiskDetector()
        self.teacher_load_analyzer = TeacherLoadAnalyzer()

        self._task_handlers: Dict[str, Callable[[Dict[str, Any], Any], Dict]] = {
            "inventory": self._task_inventory,
            "timetable.validate": self._task_timetable_validate,
            "timetable.generate": self._task_timetable_generate,
            "timetable.apply": self._task_timetable_apply,
            "report.student": self._task_report_student,
            "report.section": self._task_report_section,
            "risk.section": self._task_risk_section,
            "teacher.load": self._task_teacher_load,
        }

        self._task_aliases = {
            "timetable": "timetable.generate",
            "risk": "risk.section",
            "report": "report.student",
            "report_card": "report.student",
            "teacher": "teacher.load",
        }

    def run(self, *, task: str, payload: Optional[Dict] = None, actor=None) -> Dict:
        """
        Unified entrypoint for the AI Brain (System AI).

        Example:
            AIBrainEngine().run(task="timetable", payload={...}, actor=request.user)
        """
        payload = payload or {}
        if not task:
            return AIBrainResult(success=False, task="", error="task is required.").as_dict()

        resolved = self._task_aliases.get(task, task)
        handler = self._task_handlers.get(resolved)
        if not handler:
            return AIBrainResult(
                success=False,
                task=resolved,
                error=f"Unknown task '{resolved}'.",
                meta={"available_tasks": sorted(self._task_handlers.keys())},
            ).as_dict()

        return handler(payload, actor)

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
        result = validator.validate_existing(
            periods_per_day=periods_per_day,
            break_periods=break_periods,
            working_days=working_days,
        )
        # Backwards compatible: existing validator returns `valid`, but the system AI uses `success`.
        result.setdefault("success", bool(result.get("valid")))
        issues = result.get("issues") or []
        result.setdefault("scores", score_timetable_validation(issues))
        result.setdefault("confidence", 94)
        result.setdefault(
            "explanations",
            [
                "Validation checks timetable constraints (break slots, missing subject/teacher, teacher clashes).",
                f"Detected {len(issues)} issue(s).",
            ],
        )
        return result

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

        is_partial = bool(result.get("is_partial"))
        result.setdefault("scores", score_timetable_generation(result))
        result.setdefault("confidence", confidence_from_success(bool(result.get("success")), partial=is_partial))
        result.setdefault(
            "explanations",
            [
                "Timetable is generated using deterministic constraints + heuristic scoring (no external LLM).",
                "Each class slot contains `reasons` and a human-readable `explanation` to justify placement.",
            ],
        )

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

    # -------------------------
    # Task handlers (System AI)
    # -------------------------

    def _task_inventory(self, payload: Dict[str, Any], actor) -> Dict:
        allowed, reason = has_ai_brain_access(actor, section=None)
        if not allowed:
            return AIBrainResult(success=False, task="inventory", error=reason).as_dict()
        data = self.get_data_inventory(
            school_id=int(payload["school_id"]) if payload.get("school_id") else None,
            academic_year_id=int(payload["academic_year_id"]) if payload.get("academic_year_id") else None,
            include_models=bool(payload.get("include_models", True)),
            include_entity_counts=bool(payload.get("include_entity_counts", True)),
        )
        return AIBrainResult(
            success=True,
            task="inventory",
            data=data,
            scores={"inventory_freshness": 90.0},
            confidence=92,
            explanations=["Inventory summarizes available database entities for AI Brain modules."],
        ).as_dict()

    def _task_timetable_validate(self, payload: Dict[str, Any], actor) -> Dict:
        section_id = payload.get("section_id")
        if not section_id:
            return AIBrainResult(success=False, task="timetable.validate", error="section_id is required.").as_dict()
        section, academic_year, error = self.resolve_context(
            section_id=int(section_id),
            academic_year_id=int(payload["academic_year_id"]) if payload.get("academic_year_id") else None,
        )
        if error:
            return AIBrainResult(success=False, task="timetable.validate", error=error.get("error")).as_dict()
        allowed, reason = has_ai_brain_access(actor, section=section)
        if not allowed:
            return AIBrainResult(success=False, task="timetable.validate", error=reason).as_dict()

        result = self.run_timetable_validation(
            section=section,
            academic_year=academic_year,
            periods_per_day=int(payload.get("periods_per_day") or 8),
            break_periods=payload.get("break_periods") or [4],
            working_days=payload.get("working_days") or [1, 2, 3, 4, 5, 6],
        )
        return AIBrainResult(
            success=bool(result.get("success", True)),
            task="timetable.validate",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
        ).as_dict()

    def _task_timetable_generate(self, payload: Dict[str, Any], actor) -> Dict:
        section_id = payload.get("section_id")
        if not section_id:
            return AIBrainResult(success=False, task="timetable.generate", error="section_id is required.").as_dict()
        section, academic_year, error = self.resolve_context(
            section_id=int(section_id),
            academic_year_id=int(payload["academic_year_id"]) if payload.get("academic_year_id") else None,
        )
        if error:
            return AIBrainResult(success=False, task="timetable.generate", error=error.get("error")).as_dict()
        allowed, reason = has_ai_brain_access(actor, section=section)
        if not allowed:
            return AIBrainResult(success=False, task="timetable.generate", error=reason).as_dict()

        config = payload.get("config") or payload
        if isinstance(config, dict) and "preferences" in config:
            config = {**config, "preferences": merge_constraint_preferences(config.get("preferences") or {})}
        result = self.run_timetable_generation(
            section=section,
            academic_year=academic_year,
            config=config,
            requested_by=actor,
            persist=bool(payload.get("persist", False)),
        )
        return AIBrainResult(
            success=bool(result.get("success")),
            task="timetable.generate",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
            meta={"draft_id": result.get("draft_id")},
        ).as_dict()

    def _task_timetable_apply(self, payload: Dict[str, Any], actor) -> Dict:
        draft_id = payload.get("draft_id")
        if not draft_id:
            return AIBrainResult(success=False, task="timetable.apply", error="draft_id is required.").as_dict()
        result = self.apply_timetable_draft(
            draft_id=int(draft_id),
            actor=actor,
            manual_override_payload=payload.get("manual_override_payload") or {},
        )
        return AIBrainResult(
            success=bool(result.get("success")),
            task="timetable.apply",
            data=result,
            confidence=92 if result.get("success") else 60,
            explanations=["Draft apply is human-in-the-loop; manual overrides are recorded for auditability."],
        ).as_dict()

    def _task_report_student(self, payload: Dict[str, Any], actor) -> Dict:
        student_id = payload.get("student_id")
        exam_id = payload.get("exam_id")
        if not student_id or not exam_id:
            return AIBrainResult(
                success=False,
                task="report.student",
                error="student_id and exam_id are required.",
            ).as_dict()

        # Security: Resolve student to check section-based access
        from apps.students.models import Student

        try:
            student = Student.objects.get(id=int(student_id))
            section = student.section
        except Student.DoesNotExist:
            return AIBrainResult(success=False, task="report.student", error="Student not found.").as_dict()

        allowed, reason = has_ai_brain_access(actor, section=section)
        if not allowed:
            return AIBrainResult(success=False, task="report.student", error=reason).as_dict()

        result = self.run_report_card_builder(
            student_id=int(student_id),
            exam_id=int(exam_id),
            persist=bool(payload.get("persist", False)),
        )
        return AIBrainResult(
            success=bool(result.get("success")),
            task="report.student",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
        ).as_dict()

    def _task_report_section(self, payload: Dict[str, Any], actor) -> Dict:
        section_id = payload.get("section_id")
        exam_id = payload.get("exam_id")
        if not section_id or not exam_id:
            return AIBrainResult(success=False, task="report.section", error="section_id and exam_id are required.").as_dict()

        section, _, error = self.resolve_context(section_id=int(section_id), academic_year_id=None)
        if error:
            return AIBrainResult(success=False, task="report.section", error=error.get("error")).as_dict()
        allowed, reason = has_ai_brain_access(actor, section=section)
        if not allowed:
            return AIBrainResult(success=False, task="report.section", error=reason).as_dict()

        result = self.run_report_card_builder_for_section(
            section_id=int(section_id),
            exam_id=int(exam_id),
            persist=bool(payload.get("persist", True)),
        )
        return AIBrainResult(
            success=bool(result.get("success")),
            task="report.section",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
        ).as_dict()

    def _task_risk_section(self, payload: Dict[str, Any], actor) -> Dict:
        section_id = payload.get("section_id")
        exam_id = payload.get("exam_id")
        if not section_id or not exam_id:
            return AIBrainResult(success=False, task="risk.section", error="section_id and exam_id are required.").as_dict()

        section, _, error = self.resolve_context(section_id=int(section_id), academic_year_id=None)
        if error:
            return AIBrainResult(success=False, task="risk.section", error=error.get("error")).as_dict()
        allowed, reason = has_ai_brain_access(actor, section=section)
        if not allowed:
            return AIBrainResult(success=False, task="risk.section", error=reason).as_dict()

        result = self.run_at_risk_detector(
            section_id=int(section_id),
            exam_id=int(exam_id),
            min_attendance_pct=float(payload.get("min_attendance_pct", 75.0)),
            min_marks_pct=float(payload.get("min_marks_pct", 40.0)),
        )
        return AIBrainResult(
            success=bool(result.get("success")),
            task="risk.section",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
        ).as_dict()

    def _task_teacher_load(self, payload: Dict[str, Any], actor) -> Dict:
        allowed, reason = has_ai_brain_access(actor, section=None)
        if not allowed:
            return AIBrainResult(success=False, task="teacher.load", error=reason).as_dict()

        academic_year_id = payload.get("academic_year_id")
        if not academic_year_id:
            return AIBrainResult(success=False, task="teacher.load", error="academic_year_id is required.").as_dict()

        result = self.teacher_load_analyzer.analyze(
            academic_year_id=int(academic_year_id),
            working_days=payload.get("working_days"),
            school_id=int(payload["school_id"]) if payload.get("school_id") else None,
        )
        return AIBrainResult(
            success=True,
            task="teacher.load",
            data=result,
            scores=result.get("scores") or {},
            confidence=result.get("confidence"),
            explanations=result.get("explanations") or [],
        ).as_dict()
