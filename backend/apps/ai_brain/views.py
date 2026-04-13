from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .engine import AIBrainEngine
from .llm import merge_constraint_preferences
from .permissions import has_ai_brain_access


engine = AIBrainEngine()


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

    http_status = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=http_status)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_report_card_view(request):
    student_id = request.data.get("student_id")
    exam_id = request.data.get("exam_id")
    if not student_id or not exam_id:
        return Response(
            {"error": "student_id and exam_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = engine.run_report_card_builder(
        student_id=student_id,
        exam_id=exam_id,
        persist=bool(request.data.get("persist", False)),
    )
    http_status = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=http_status)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_report_cards_for_section_view(request):
    section_id = request.data.get("section_id")
    exam_id = request.data.get("exam_id")
    if not section_id or not exam_id:
        return Response(
            {"error": "section_id and exam_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    section, _, error = engine.resolve_context(section_id=section_id, academic_year_id=None)
    if error:
        return Response(error, status=status.HTTP_404_NOT_FOUND)
    allowed, reason = has_ai_brain_access(request.user, section=section)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

    result = engine.run_report_card_builder_for_section(
        section_id=section_id,
        exam_id=exam_id,
        persist=bool(request.data.get("persist", True)),
    )
    http_status = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=http_status)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def detect_at_risk_students_view(request):
    section_id = request.data.get("section_id")
    exam_id = request.data.get("exam_id")
    if not section_id or not exam_id:
        return Response(
            {"error": "section_id and exam_id are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

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
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_timetable_draft_view(request, draft_id: int):
    result = engine.apply_timetable_draft(
        draft_id=draft_id,
        actor=request.user,
        manual_override_payload=request.data.get("manual_override_payload") or {},
    )
    http_status = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
    return Response(result, status=http_status)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_inventory_view(request):
    allowed, reason = has_ai_brain_access(request.user, section=None)
    if not allowed:
        return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)
    return Response(engine.get_data_inventory(), status=status.HTTP_200_OK)
