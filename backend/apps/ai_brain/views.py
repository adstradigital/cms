from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .engine import AIBrainEngine
from .data_context import _parse_bool
from .llm import merge_constraint_preferences
from .permissions import has_ai_brain_access
from .models import AIBrainAuditLog, AIBrainDraft, AtRiskRecord, AutomationTaskLog


engine = AIBrainEngine()


# ─── Timetable ────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_timetable_view(request):
    section_id = request.data.get("section_id")
    if not section_id:
        return Response({"error": "section_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    section, academic_year, error = engine.resolve_context(
        section_id=section_id, academic_year_id=request.data.get("academic_year_id")
    )
    if error:
        return Response(error, status=status.HTTP_404_NOT_FOUND)
    allowed, reason = has_ai_brain_access(request.user, section=section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    result = engine.run_timetable_validation(
        section=section,
        academic_year=academic_year,
        periods_per_day=request.data.get("periods_per_day") or 8,
        break_periods=request.data.get("break_periods") or [4],
        working_days=request.data.get("working_days") or [1, 2, 3, 4, 5, 6],
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_timetable_view(request):
    section_id = request.data.get("section_id")
    if not section_id:
        return Response({"error": "section_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    section, academic_year, error = engine.resolve_context(
        section_id=section_id, academic_year_id=request.data.get("academic_year_id")
    )
    if error:
        return Response(error, status=status.HTTP_404_NOT_FOUND)
    allowed, reason = has_ai_brain_access(request.user, section=section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    config = {
        "working_days": request.data.get("working_days"),
        "periods_per_day": request.data.get("periods_per_day"),
        "break_periods": request.data.get("break_periods"),
        "initial_draft": request.data.get("initial_draft"),
        "preferences": merge_constraint_preferences(request.data.get("preferences", {})),
    }
    result = engine.run_timetable_generation(
        section=section,
        academic_year=academic_year,
        config=config,
        requested_by=request.user,
        persist=bool(request.data.get("persist", False)),
    )
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_timetable_draft_view(request, draft_id: int):
    result = engine.apply_timetable_draft(
        draft_id=draft_id,
        actor=request.user,
        manual_override_payload=request.data.get("manual_override_payload") or {},
    )
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rollback_timetable_draft_view(request, draft_id: int):
    result = engine.rollback_timetable(draft_id=draft_id, actor=request.user)
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


# ─── Report Cards ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_report_card_view(request):
    student_id = request.data.get("student_id")
    exam_id = request.data.get("exam_id")
    if not student_id or not exam_id:
        return Response({"error": "student_id and exam_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    from apps.students.models import Student
    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

    allowed, reason = has_ai_brain_access(request.user, section=student.section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    result = engine.run_report_card_builder(
        student_id=student_id, exam_id=exam_id, persist=bool(request.data.get("persist", False))
    )
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_report_cards_for_section_view(request):
    section_id = request.data.get("section_id")
    exam_id = request.data.get("exam_id")
    if not section_id or not exam_id:
        return Response({"error": "section_id and exam_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    section, _, error = engine.resolve_context(section_id=section_id, academic_year_id=None)
    if error:
        return Response(error, status=status.HTTP_404_NOT_FOUND)
    allowed, reason = has_ai_brain_access(request.user, section=section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    async_mode = bool(request.data.get("async", False))
    if async_mode:
        return _launch_async_report_card_task(request, section_id, exam_id)

    result = engine.run_report_card_builder_for_section(
        section_id=section_id, exam_id=exam_id, persist=bool(request.data.get("persist", True))
    )
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


def _launch_async_report_card_task(request, section_id, exam_id):
    from apps.accounts.models import School
    school = request.user.school
    task_log = AutomationTaskLog.objects.create(
        task_type="report_card_bulk",
        school=school,
        section_id=section_id,
        triggered_by=request.user,
        input_payload={"section_id": section_id, "exam_id": exam_id},
    )
    try:
        from .tasks import bulk_generate_report_cards_async
        celery_task = bulk_generate_report_cards_async.delay(task_log.id, section_id, exam_id)
        task_log.celery_task_id = celery_task.id
        task_log.status = "pending"
        task_log.save(update_fields=["celery_task_id", "status"])
    except Exception as e:
        task_log.status = "failed"
        task_log.error_message = str(e)
        task_log.save(update_fields=["status", "error_message"])
        return Response({"error": "Failed to queue task.", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({"success": True, "task_id": task_log.id, "message": "Report card generation queued."}, status=status.HTTP_202_ACCEPTED)


# ─── At-Risk ──────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def detect_at_risk_students_view(request):
    section_id = request.data.get("section_id")
    exam_id = request.data.get("exam_id")
    if not section_id or not exam_id:
        return Response({"error": "section_id and exam_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    section, _, error = engine.resolve_context(section_id=section_id, academic_year_id=None)
    if error:
        return Response(error, status=status.HTTP_404_NOT_FOUND)
    allowed, reason = has_ai_brain_access(request.user, section=section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    result = engine.run_at_risk_detector(
        section_id=section_id,
        exam_id=exam_id,
        min_attendance_pct=float(request.data.get("min_attendance_pct", 75.0)),
        min_marks_pct=float(request.data.get("min_marks_pct", 40.0)),
        persist=bool(request.data.get("persist", False)),
        actor=request.user,
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_at_risk_sweep_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    school_id = request.data.get("school_id") or (request.user.school_id if hasattr(request.user, "school_id") else None)
    exam_id = request.data.get("exam_id")
    if not school_id or not exam_id:
        return Response({"error": "school_id and exam_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    result = engine.run_school_at_risk_sweep(
        school_id=school_id,
        exam_id=exam_id,
        min_attendance_pct=float(request.data.get("min_attendance_pct", 75.0)),
        min_marks_pct=float(request.data.get("min_marks_pct", 40.0)),
        actor=request.user,
    )
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def at_risk_records_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    qp = request.query_params
    qs = AtRiskRecord.objects.select_related("student__section", "section", "exam", "resolved_by")

    if qp.get("section_id"):
        qs = qs.filter(section_id=qp["section_id"])
    if qp.get("school_id"):
        qs = qs.filter(school_id=qp["school_id"])
    if qp.get("exam_id"):
        qs = qs.filter(exam_id=qp["exam_id"])
    if qp.get("resolved") is not None:
        qs = qs.filter(resolved=_parse_bool(qp.get("resolved"), default=False))

    records = []
    for r in qs[:200]:
        records.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.user.get_full_name() if hasattr(r.student, "user") else str(r.student),
            "section": str(r.section) if r.section else None,
            "section_id": r.section_id,
            "exam": str(r.exam) if r.exam else None,
            "exam_id": r.exam_id,
            "flagged_on": r.flagged_on,
            "reasons": r.reasons,
            "attendance_pct": r.attendance_pct,
            "marks_pct": r.marks_pct,
            "resolved": r.resolved,
            "resolved_by": r.resolved_by.get_full_name() if r.resolved_by else None,
            "resolved_at": r.resolved_at,
            "notified": r.notified,
            "created_at": r.created_at,
        })

    return Response({"success": True, "count": len(records), "records": records}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resolve_at_risk_view(request, record_id: int):
    result = engine.resolve_at_risk(record_id=record_id, actor=request.user)
    return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)


# ─── Audit Log ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def audit_log_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    qp = request.query_params
    qs = AIBrainAuditLog.objects.select_related("actor", "draft")

    if qp.get("action"):
        qs = qs.filter(action=qp["action"])
    if qp.get("draft_type"):
        qs = qs.filter(draft__draft_type=qp["draft_type"])

    logs = []
    for log in qs[:100]:
        logs.append({
            "id": log.id,
            "action": log.action,
            "actor": log.actor.get_full_name() if log.actor else "System",
            "draft_id": log.draft_id,
            "draft_type": log.draft.draft_type if log.draft else None,
            "details": log.details,
            "created_at": log.created_at,
        })

    return Response({"success": True, "count": len(logs), "logs": logs}, status=status.HTTP_200_OK)


# ─── Task Logs ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_logs_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    qp = request.query_params
    qs = AutomationTaskLog.objects.select_related("triggered_by", "school", "section")

    if qp.get("task_type"):
        qs = qs.filter(task_type=qp["task_type"])
    if qp.get("status"):
        qs = qs.filter(status=qp["status"])
    if qp.get("school_id"):
        qs = qs.filter(school_id=qp["school_id"])

    logs = []
    for log in qs[:100]:
        logs.append({
            "id": log.id,
            "task_type": log.task_type,
            "status": log.status,
            "school": str(log.school) if log.school else None,
            "section": str(log.section) if log.section else None,
            "triggered_by": log.triggered_by.get_full_name() if log.triggered_by else "Scheduler",
            "result_payload": log.result_payload,
            "error_message": log.error_message,
            "started_at": log.started_at,
            "completed_at": log.completed_at,
            "created_at": log.created_at,
        })

    return Response({"success": True, "count": len(logs), "logs": logs}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_status_view(request, task_id: int):
    try:
        log = AutomationTaskLog.objects.get(id=task_id)
    except AutomationTaskLog.DoesNotExist:
        return Response({"error": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "id": log.id,
        "task_type": log.task_type,
        "status": log.status,
        "result_payload": log.result_payload,
        "error_message": log.error_message,
        "started_at": log.started_at,
        "completed_at": log.completed_at,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trigger_task_view(request):
    """Manually trigger an automation task."""
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    task_type = request.data.get("task_type")
    valid_types = [c[0] for c in AutomationTaskLog.TASK_TYPE_CHOICES]
    if task_type not in valid_types:
        return Response({"error": f"Invalid task_type. Choose from: {valid_types}"}, status=status.HTTP_400_BAD_REQUEST)

    school = getattr(request.user, "school", None)
    task_log = AutomationTaskLog.objects.create(
        task_type=task_type,
        school=school,
        triggered_by=request.user,
        input_payload=request.data,
    )

    try:
        from . import tasks as ai_tasks
        task_map = {
            "at_risk_sweep": ai_tasks.weekly_at_risk_sweep,
            "attendance_check": ai_tasks.daily_attendance_incomplete_check,
            "consecutive_absence": ai_tasks.daily_consecutive_absence_alert,
            "performance_digest": ai_tasks.weekly_performance_digest,
            "draft_cleanup": ai_tasks.cleanup_old_drafts,
            "report_card_bulk": None,  # requires section/exam params
        }
        task_fn = task_map.get(task_type)
        if task_fn:
            celery_task = task_fn.delay(task_log.id)
            task_log.celery_task_id = celery_task.id
            task_log.save(update_fields=["celery_task_id"])
    except Exception as e:
        task_log.status = "failed"
        task_log.error_message = str(e)
        task_log.save(update_fields=["status", "error_message"])
        return Response({"error": "Failed to queue task.", "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"success": True, "task_id": task_log.id, "message": f"Task '{task_type}' queued."}, status=status.HTTP_202_ACCEPTED)


# ─── Data Inventory ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_inventory_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    qp = request.query_params
    school_id = qp.get("school_id")
    academic_year_id = qp.get("academic_year_id")
    include_models = _parse_bool(qp.get("include_models"), default=True)
    include_entity_counts = _parse_bool(qp.get("include_entity_counts"), default=True)

    inventory = engine.get_data_inventory(
        school_id=int(school_id) if school_id else None,
        academic_year_id=int(academic_year_id) if academic_year_id else None,
        include_models=include_models,
        include_entity_counts=include_entity_counts,
    )
    return Response(inventory, status=status.HTTP_200_OK)
