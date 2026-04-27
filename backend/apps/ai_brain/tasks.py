"""
Celery tasks for AI Brain automation.

Schedule (configured in settings.CELERY_BEAT_SCHEDULE):
  - daily_attendance_incomplete_check  → daily at 17:00 IST
  - daily_consecutive_absence_alert    → daily at 07:00 IST
  - weekly_at_risk_sweep               → every Friday at 16:00 IST
  - weekly_performance_digest          → every Friday at 16:30 IST
  - cleanup_old_drafts                 → every Sunday at 00:00 IST
"""

from __future__ import annotations

from celery import shared_task
from django.utils import timezone


def _mark_running(task_log_id: int):
    from .models import AutomationTaskLog
    AutomationTaskLog.objects.filter(id=task_log_id).update(
        status="running", started_at=timezone.now()
    )


def _mark_done(task_log_id: int, result: dict):
    from .models import AutomationTaskLog
    AutomationTaskLog.objects.filter(id=task_log_id).update(
        status="success", completed_at=timezone.now(), result_payload=result
    )


def _mark_failed(task_log_id: int, error: str):
    from .models import AutomationTaskLog
    AutomationTaskLog.objects.filter(id=task_log_id).update(
        status="failed", completed_at=timezone.now(), error_message=error
    )


@shared_task(name="ai_brain.bulk_generate_report_cards_async")
def bulk_generate_report_cards_async(task_log_id: int, section_id: int, exam_id: int):
    _mark_running(task_log_id)
    try:
        from .engine import AIBrainEngine
        engine = AIBrainEngine()
        result = engine.run_report_card_builder_for_section(
            section_id=section_id, exam_id=exam_id, persist=True
        )
        _mark_done(task_log_id, result)
        return result
    except Exception as e:
        _mark_failed(task_log_id, str(e))
        raise


@shared_task(name="ai_brain.daily_attendance_incomplete_check")
def daily_attendance_incomplete_check(task_log_id: int = None):
    """
    Find sections that have not marked attendance today and notify their class teachers.
    """
    from apps.students.models import Section
    from apps.attendance.models import Attendance
    from apps.notifications.models import Notification

    today = timezone.localdate()
    if task_log_id:
        _mark_running(task_log_id)

    sections_missing = []
    try:
        sections = Section.objects.select_related(
            "class_teacher", "school_class__school"
        ).filter(class_teacher__isnull=False)

        for section in sections:
            # Check if any attendance exists for this section today
            has_attendance = Attendance.objects.filter(
                student__section=section,
                date=today,
            ).exists()

            if not has_attendance:
                sections_missing.append(section.id)
                Notification.objects.create(
                    title="Attendance Not Marked",
                    body=f"Attendance for {section} has not been marked for {today}. Please mark it before end of day.",
                    notification_type="attendance",
                    target_audience="staff",
                    target_section=section,
                    created_by=None,
                    is_published=True,
                )

        result = {"sections_missing_attendance": sections_missing, "count": len(sections_missing), "date": str(today)}
        if task_log_id:
            _mark_done(task_log_id, result)
        return result

    except Exception as e:
        if task_log_id:
            _mark_failed(task_log_id, str(e))
        raise


@shared_task(name="ai_brain.daily_consecutive_absence_alert")
def daily_consecutive_absence_alert(task_log_id: int = None):
    """
    Flag students absent for 3+ consecutive days and notify parents via section notification.
    """
    from apps.students.models import Student
    from apps.attendance.models import Attendance
    from apps.notifications.models import Notification
    from django.db.models import Q
    import datetime

    today = timezone.localdate()
    last_3_days = [today - datetime.timedelta(days=i) for i in range(3)]

    if task_log_id:
        _mark_running(task_log_id)

    alerted_students = []
    try:
        students = Student.objects.select_related("section").filter(is_active=True)

        # Group by section to batch notifications
        section_flagged: dict = {}
        for student in students:
            absent_records = Attendance.objects.filter(
                student=student,
                date__in=last_3_days,
                status="absent",
            ).count()
            if absent_records >= 3:
                alerted_students.append(student.id)
                sec_id = student.section_id
                if sec_id not in section_flagged:
                    section_flagged[sec_id] = {"section": student.section, "names": []}
                full_name = student.user.get_full_name() if hasattr(student, "user") else str(student)
                section_flagged[sec_id]["names"].append(full_name)

        for sec_id, data in section_flagged.items():
            names_str = ", ".join(data["names"])
            Notification.objects.create(
                title="Consecutive Absence Alert",
                body=f"The following student(s) have been absent for 3 or more consecutive days: {names_str}. Please contact their parents.",
                notification_type="attendance",
                target_audience="parents",
                target_section=data["section"],
                created_by=None,
                is_published=True,
            )

        result = {"alerted_student_ids": alerted_students, "count": len(alerted_students), "date": str(today)}
        if task_log_id:
            _mark_done(task_log_id, result)
        return result

    except Exception as e:
        if task_log_id:
            _mark_failed(task_log_id, str(e))
        raise


@shared_task(name="ai_brain.weekly_at_risk_sweep")
def weekly_at_risk_sweep(task_log_id: int = None):
    """
    Run at-risk detection across all schools for the latest active exam.
    Persists AtRiskRecord entries and sends parent notifications per section.
    """
    from apps.accounts.models import School, AcademicYear
    from apps.exams.models import Exam

    if task_log_id:
        _mark_running(task_log_id)

    try:
        from .engine import AIBrainEngine
        engine = AIBrainEngine()

        schools = School.objects.all()
        total_flagged = 0
        schools_processed = 0

        for school in schools:
            active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
            if not active_year:
                continue

            exam = Exam.objects.filter(
                academic_year=active_year
            ).order_by("-created_at").first()
            if not exam:
                continue

            sweep_result = engine.run_school_at_risk_sweep(
                school_id=school.id,
                exam_id=exam.id,
            )
            total_flagged += sweep_result.get("total_flagged", 0)
            schools_processed += 1

        result = {
            "schools_processed": schools_processed,
            "total_flagged": total_flagged,
            "run_at": str(timezone.now()),
        }
        if task_log_id:
            _mark_done(task_log_id, result)
        return result

    except Exception as e:
        if task_log_id:
            _mark_failed(task_log_id, str(e))
        raise


@shared_task(name="ai_brain.weekly_performance_digest")
def weekly_performance_digest(task_log_id: int = None):
    """
    Generate a weekly class performance summary for each section and notify class teachers.
    Uses existing ReportCard data — does not regenerate cards.
    """
    from apps.students.models import Section
    from apps.exams.models import ReportCard, Exam
    from apps.accounts.models import AcademicYear
    from apps.notifications.models import Notification
    from django.db.models import Avg, Count, Min, Max

    if task_log_id:
        _mark_running(task_log_id)

    sections_processed = 0
    try:
        sections = Section.objects.select_related("school_class__school", "class_teacher").all()

        for section in sections:
            school = section.school_class.school
            active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
            if not active_year:
                continue

            exam = Exam.objects.filter(academic_year=active_year).order_by("-created_at").first()
            if not exam:
                continue

            stats = ReportCard.objects.filter(
                student__section=section,
                exam=exam,
            ).aggregate(
                avg_pct=Avg("percentage"),
                count=Count("id"),
                top_pct=Max("percentage"),
                bottom_pct=Min("percentage"),
            )

            if not stats["count"]:
                continue

            avg = round(stats["avg_pct"] or 0, 1)
            top = round(stats["top_pct"] or 0, 1)
            bottom = round(stats["bottom_pct"] or 0, 1)

            Notification.objects.create(
                title=f"Weekly Digest — {section}",
                body=(
                    f"Performance summary for {section} ({exam}):\n"
                    f"• Students assessed: {stats['count']}\n"
                    f"• Class average: {avg}%\n"
                    f"• Highest: {top}% | Lowest: {bottom}%"
                ),
                notification_type="exam",
                target_audience="staff",
                target_section=section,
                created_by=None,
                is_published=True,
            )
            sections_processed += 1

        result = {"sections_processed": sections_processed, "run_at": str(timezone.now())}
        if task_log_id:
            _mark_done(task_log_id, result)
        return result

    except Exception as e:
        if task_log_id:
            _mark_failed(task_log_id, str(e))
        raise


@shared_task(name="ai_brain.cleanup_old_drafts")
def cleanup_old_drafts(task_log_id: int = None):
    """Delete discarded AIBrainDraft records older than 30 days."""
    from .models import AIBrainDraft
    import datetime

    if task_log_id:
        _mark_running(task_log_id)

    cutoff = timezone.now() - datetime.timedelta(days=30)
    try:
        deleted_count, _ = AIBrainDraft.objects.filter(
            status="discarded",
            created_at__lt=cutoff,
        ).delete()

        result = {"deleted_drafts": deleted_count, "cutoff": str(cutoff)}
        if task_log_id:
            _mark_done(task_log_id, result)
        return result

    except Exception as e:
        if task_log_id:
            _mark_failed(task_log_id, str(e))
        raise
