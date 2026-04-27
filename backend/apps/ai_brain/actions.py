from __future__ import annotations

from typing import Dict, List

from django.db import transaction

from apps.academics.models import Period, Subject, Timetable
from apps.attendance.models import AttendanceWarning
from apps.accounts.models import AcademicYear, User
from apps.exams.models import ReportCard
from .models import AIBrainAuditLog, AIBrainDraft


def save_timetable_draft(
    *,
    section,
    academic_year,
    draft_rows: List[Dict],
    periods_per_day: int,
    break_periods: List[int],
) -> Dict:
    skipped_days = []
    from datetime import time, datetime, timedelta
    
    # Helper to calculate basic times (Standard 45m slots, 8:30 start)
    # In a real app, this should come from AcademicYear settings
    def get_times(p_num):
        start = datetime.combine(datetime.today(), time(8, 30))
        # Add 45 mins per period, plus maybe 45 for lunch
        # (Simple logic: linear slots)
        p_start = start + timedelta(minutes=(p_num - 1) * 45)
        p_end = p_start + timedelta(minutes=45)
        return p_start.time(), p_end.time()

    with transaction.atomic():
        for row in draft_rows:
            day = row["day_of_week"]
            timetable, _ = Timetable.objects.get_or_create(
                section=section,
                academic_year=academic_year,
                day_of_week=day,
            )
            if timetable.is_published:
                skipped_days.append(day)
                continue

            timetable.periods.all().delete()
            for slot in row["periods"]:
                period_number = slot["period_number"]
                slot_type = slot.get("type", "free")
                s_time, e_time = get_times(period_number)
                
                if slot_type == "break":
                    Period.objects.create(
                        timetable=timetable,
                        period_number=period_number,
                        period_type="break",
                        start_time=s_time,
                        end_time=e_time,
                    )
                    continue
                if slot_type in {"event", "custom"}:
                    Period.objects.create(
                        timetable=timetable,
                        period_number=period_number,
                        period_type="custom",
                        custom_title=slot.get("custom_title") or slot.get("customTitle") or slot.get("title") or "Special Event",
                        teacher_id=slot.get("teacher_id"),
                        start_time=s_time,
                        end_time=e_time,
                    )
                    continue
                if slot_type != "class":
                    continue

                subject = Subject.objects.filter(id=slot.get("subject_id")).first()
                Period.objects.create(
                    timetable=timetable,
                    period_number=period_number,
                    period_type="class",
                    subject=subject,
                    teacher_id=slot.get("teacher_id"),
                    start_time=s_time,
                    end_time=e_time,
                )

    return {
        "success": True,
        "saved_count": len(draft_rows) - len(skipped_days),
        "skipped_published_days": skipped_days,
        "periods_per_day": periods_per_day,
        "break_periods": break_periods,
    }


def create_ai_brain_draft(
    *,
    draft_type: str,
    school,
    requested_by: User,
    input_payload: Dict,
    output_payload: Dict,
    section=None,
    exam=None,
) -> AIBrainDraft:
    draft = AIBrainDraft.objects.create(
        draft_type=draft_type,
        school=school,
        section=section,
        exam=exam,
        requested_by=requested_by,
        input_payload=input_payload or {},
        output_payload=output_payload or {},
        status="preview",
    )
    AIBrainAuditLog.objects.create(
        draft=draft,
        action="preview_generated",
        actor=requested_by,
        details={"draft_type": draft_type},
    )
    return draft


def apply_timetable_preview(
    *,
    draft: AIBrainDraft,
    actor: User,
    manual_override_payload: Dict | None = None,
) -> Dict:
    payload = manual_override_payload or {}
    draft_rows = payload.get("draft") or draft.output_payload.get("draft") or []
    periods_per_day = payload.get("periods_per_day") or draft.input_payload.get("periods_per_day") or 8
    break_periods = payload.get("break_periods") or draft.input_payload.get("break_periods") or [4]
    academic_year_id = payload.get("academic_year_id") or draft.input_payload.get("academic_year_id")
    academic_year = AcademicYear.objects.filter(id=academic_year_id).first() if academic_year_id else None
    if not draft.section or not academic_year:
        return {"success": False, "error": "Draft is missing section or academic year context."}

    save_meta = save_timetable_draft(
        section=draft.section,
        academic_year=academic_year,
        draft_rows=draft_rows,
        periods_per_day=periods_per_day,
        break_periods=break_periods,
    )
    if not save_meta.get("success"):
        return save_meta

    draft.status = "applied"
    draft.is_applied = True
    if payload:
        draft.manual_override_payload = payload
    draft.save(update_fields=["status", "is_applied", "manual_override_payload", "updated_at"])

    AIBrainAuditLog.objects.create(
        draft=draft,
        action="preview_applied",
        actor=actor,
        details={
            "manual_override": bool(payload),
            "saved_days": save_meta.get("saved_days", 0),
        },
    )
    return save_meta


def flag_student(
    *,
    student_id: int,
    attendance_percentage: float,
    threshold: float,
    message: str,
    actor: User,
) -> Dict:
    warning = AttendanceWarning.objects.create(
        student_id=student_id,
        sent_by=actor,
        attendance_percentage=attendance_percentage,
        threshold=threshold,
        message=message,
    )
    return {"success": True, "warning_id": warning.id}


def save_report_card(
    *,
    student_id: int,
    exam_id: int,
    total_marks: float,
    percentage: float,
    grade: str,
    rank: int,
    teacher_remarks: str,
) -> Dict:
    report_card, _ = ReportCard.objects.update_or_create(
        student_id=student_id,
        exam_id=exam_id,
        defaults={
            "total_marks": total_marks,
            "percentage": percentage,
            "grade": grade,
            "rank": rank,
            "teacher_remarks": teacher_remarks,
        },
    )
    return {"success": True, "report_card_id": report_card.id}
