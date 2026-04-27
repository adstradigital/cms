from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from django.db import transaction
from django.utils import timezone

from apps.academics.models import Period, Subject, Timetable
from apps.attendance.models import AttendanceWarning
from apps.accounts.models import AcademicYear, User
from apps.exams.models import ReportCard
from .models import AIBrainAuditLog, AIBrainDraft, AtRiskRecord


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

    def get_times(p_num):
        start = datetime.combine(datetime.today(), time(8, 30))
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


def _snapshot_existing_timetable(section, academic_year) -> List[Dict]:
    """Snapshot current timetable periods for rollback."""
    rows = []
    timetables = Timetable.objects.filter(
        section=section, academic_year=academic_year
    ).prefetch_related("periods")
    for tt in timetables:
        periods = []
        for p in tt.periods.all():
            periods.append({
                "period_number": p.period_number,
                "type": p.period_type,
                "subject_id": p.subject_id,
                "teacher_id": p.teacher_id,
                "start_time": str(p.start_time),
                "end_time": str(p.end_time),
            })
        rows.append({"day_of_week": tt.day_of_week, "is_published": tt.is_published, "periods": periods})
    return rows


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

    # Snapshot existing timetable before overwriting (enables rollback)
    snapshot = _snapshot_existing_timetable(draft.section, academic_year)
    draft.rollback_payload = {"snapshot": snapshot, "academic_year_id": academic_year.id}
    draft.save(update_fields=["rollback_payload"])

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
            "saved_days": save_meta.get("saved_count", 0),
        },
    )
    return save_meta


def rollback_timetable_draft(*, draft: AIBrainDraft, actor: User) -> Dict:
    """Restore the timetable to the state before the draft was applied."""
    rollback = draft.rollback_payload
    if not rollback or not rollback.get("snapshot"):
        return {"success": False, "error": "No rollback snapshot available for this draft."}
    if not draft.is_applied:
        return {"success": False, "error": "Draft has not been applied yet."}

    academic_year_id = rollback.get("academic_year_id")
    academic_year = AcademicYear.objects.filter(id=academic_year_id).first() if academic_year_id else None
    if not draft.section or not academic_year:
        return {"success": False, "error": "Cannot resolve section or academic year for rollback."}

    snapshot_rows = rollback["snapshot"]
    with transaction.atomic():
        for row in snapshot_rows:
            day = row["day_of_week"]
            timetable, _ = Timetable.objects.get_or_create(
                section=draft.section, academic_year=academic_year, day_of_week=day
            )
            timetable.periods.all().delete()
            from datetime import time
            for p in row["periods"]:
                Period.objects.create(
                    timetable=timetable,
                    period_number=p["period_number"],
                    period_type=p["type"],
                    subject_id=p.get("subject_id"),
                    teacher_id=p.get("teacher_id"),
                    start_time=p["start_time"],
                    end_time=p["end_time"],
                )

    draft.status = "discarded"
    draft.is_applied = False
    draft.save(update_fields=["status", "is_applied", "updated_at"])

    AIBrainAuditLog.objects.create(
        draft=draft,
        action="timetable_rolled_back",
        actor=actor,
        details={"restored_days": len(snapshot_rows)},
    )
    return {"success": True, "restored_days": len(snapshot_rows)}


def save_at_risk_records(
    *,
    flagged_students: List[Dict],
    section,
    school,
    exam=None,
    actor: Optional[User] = None,
) -> Dict:
    """Persist at-risk detection results and create parent notifications."""
    from apps.notifications.models import Notification

    created = 0
    updated = 0
    today = timezone.now().date()

    with transaction.atomic():
        for entry in flagged_students:
            student_id = entry["student_id"]
            record, is_new = AtRiskRecord.objects.update_or_create(
                student_id=student_id,
                exam=exam,
                defaults={
                    "section": section,
                    "school": school,
                    "reasons": entry.get("reasons", []),
                    "attendance_pct": entry.get("attendance_percentage", 0),
                    "marks_pct": entry.get("marks_percentage"),
                    "resolved": False,
                },
            )
            if is_new:
                created += 1
            else:
                updated += 1

        # Single notification per section sweep so parents are alerted
        if flagged_students and section:
            reason_summary = f"{len(flagged_students)} student(s) flagged for attendance/performance concerns."
            Notification.objects.create(
                title="At-Risk Alert",
                body=reason_summary,
                notification_type="attendance",
                target_audience="parents",
                target_section=section,
                created_by=actor,
                is_published=True,
            )
            AtRiskRecord.objects.filter(
                section=section, exam=exam, resolved=False
            ).update(notified=True)

    AIBrainAuditLog.objects.create(
        draft=None,
        action="at_risk_sweep",
        actor=actor,
        details={
            "section_id": section.id if section else None,
            "exam_id": exam.id if exam else None,
            "flagged_count": len(flagged_students),
            "created": created,
            "updated": updated,
        },
    )
    return {"success": True, "created": created, "updated": updated, "notified": bool(flagged_students)}


def resolve_at_risk_record(*, record: AtRiskRecord, actor: User) -> Dict:
    record.resolved = True
    record.resolved_by = actor
    record.resolved_at = timezone.now()
    record.save(update_fields=["resolved", "resolved_by", "resolved_at"])

    AIBrainAuditLog.objects.create(
        draft=None,
        action="at_risk_resolved",
        actor=actor,
        details={"record_id": record.id, "student_id": record.student_id},
    )
    return {"success": True, "record_id": record.id}


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
