from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from .models import Subject, Timetable, Period, Homework, HomeworkSubmission, SubstituteLog
from .serializers import (
    SubjectSerializer, TimetableSerializer, PeriodSerializer,
    HomeworkSerializer, HomeworkSubmissionSerializer, SubstituteLogSerializer,
)


# ─── Subject ──────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def subject_list_view(request):
    try:
        if request.method == "GET":
            class_id = request.query_params.get("class")
            teacher_id = request.query_params.get("teacher")
            qs = Subject.objects.select_related("school_class", "teacher").all()
            if class_id:
                qs = qs.filter(school_class_id=class_id)
            if teacher_id:
                qs = qs.filter(teacher_id=teacher_id)
            return Response(SubjectSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = SubjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def subject_detail_view(request, pk):
    try:
        try:
            subject = Subject.objects.select_related("school_class", "teacher").get(pk=pk)
        except Subject.DoesNotExist:
            return Response({"error": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(SubjectSerializer(subject).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = SubjectSerializer(subject, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        subject.delete()
        return Response({"message": "Subject deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Timetable ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def timetable_list_view(request):
    try:
        if request.method == "GET":
            section_id = request.query_params.get("section")
            academic_year_id = request.query_params.get("academic_year")
            day = request.query_params.get("day")

            qs = Timetable.objects.select_related(
                "section", "section__school_class", "academic_year"
            ).prefetch_related("periods__subject", "periods__teacher").all()

            if section_id:
                qs = qs.filter(section_id=section_id)
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            if day:
                qs = qs.filter(day_of_week=day)

            return Response(TimetableSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = TimetableSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def timetable_detail_view(request, pk):
    try:
        try:
            timetable = Timetable.objects.select_related(
                "section", "section__school_class", "academic_year"
            ).prefetch_related("periods__subject", "periods__teacher").get(pk=pk)
        except Timetable.DoesNotExist:
            return Response({"error": "Timetable not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(TimetableSerializer(timetable).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = TimetableSerializer(timetable, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        timetable.delete()
        return Response({"message": "Timetable deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def timetable_publish_view(request, pk):
    try:
        try:
            timetable = Timetable.objects.get(pk=pk)
        except Timetable.DoesNotExist:
            return Response({"error": "Timetable not found."}, status=status.HTTP_404_NOT_FOUND)
        timetable.is_published = True
        timetable.save()
        return Response({"message": "Timetable published."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Period ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def period_create_view(request, timetable_pk):
    try:
        data = {**request.data, "timetable": timetable_pk}
        serializer = PeriodSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        teacher_id = request.data.get("teacher")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")

        if teacher_id and start_time and end_time:
            conflict = Period.objects.filter(
                timetable__day_of_week=Timetable.objects.get(pk=timetable_pk).day_of_week,
                teacher_id=teacher_id,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).exclude(timetable_id=timetable_pk)

            if conflict.exists():
                return Response(
                    {"error": "Teacher already has a period at this time on this day."},
                    status=status.HTTP_409_CONFLICT,
                )

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def period_detail_view(request, pk):
    try:
        try:
            period = Period.objects.select_related("subject", "teacher", "timetable").get(pk=pk)
        except Period.DoesNotExist:
            return Response({"error": "Period not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            serializer = PeriodSerializer(period, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        period.delete()
        return Response({"message": "Period deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Homework ─────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def homework_list_view(request):
    try:
        if request.method == "GET":
            section_id = request.query_params.get("section")
            subject_id = request.query_params.get("subject")
            due_date = request.query_params.get("due_date")

            qs = Homework.objects.select_related(
                "subject", "section", "section__school_class", "assigned_by"
            ).all()

            if section_id:
                qs = qs.filter(section_id=section_id)
            if subject_id:
                qs = qs.filter(subject_id=subject_id)
            if due_date:
                qs = qs.filter(due_date=due_date)

            return Response(HomeworkSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = HomeworkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        homework = serializer.save(assigned_by=request.user)
        return Response(HomeworkSerializer(homework).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def homework_detail_view(request, pk):
    try:
        try:
            homework = Homework.objects.select_related(
                "subject", "section", "section__school_class", "assigned_by"
            ).get(pk=pk)
        except Homework.DoesNotExist:
            return Response({"error": "Homework not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(HomeworkSerializer(homework).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = HomeworkSerializer(homework, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        homework.delete()
        return Response({"message": "Homework deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Homework Submission ──────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def homework_submission_list_view(request, homework_pk):
    try:
        if request.method == "GET":
            qs = HomeworkSubmission.objects.select_related(
                "student", "student__user", "homework"
            ).filter(homework_id=homework_pk)
            return Response(HomeworkSubmissionSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        try:
            homework = Homework.objects.get(pk=homework_pk)
        except Homework.DoesNotExist:
            return Response({"error": "Homework not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {**request.data, "homework": homework_pk}
        serializer = HomeworkSubmissionSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        is_late = timezone.now().date() > homework.due_date
        submission = serializer.save(is_late=is_late)
        return Response(HomeworkSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def homework_submission_grade_view(request, pk):
    """Teacher grades a submission."""
    try:
        try:
            submission = HomeworkSubmission.objects.get(pk=pk)
        except HomeworkSubmission.DoesNotExist:
            return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)

        grade = request.data.get("grade")
        remarks = request.data.get("remarks", "")

        if not grade:
            return Response({"error": "Grade is required."}, status=status.HTTP_400_BAD_REQUEST)

        submission.grade = grade
        submission.remarks = remarks
        submission.save()
        return Response(HomeworkSubmissionSerializer(submission).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Substitute ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def substitute_log_list_view(request):
    try:
        if request.method == "GET":
            date = request.query_params.get("date", timezone.now().date())
            teacher_id = request.query_params.get("teacher")
            qs = SubstituteLog.objects.select_related(
                "period", "period__timetable__section",
                "original_teacher", "substitute_teacher"
            ).filter(date=date)
            if teacher_id:
                qs = qs.filter(original_teacher_id=teacher_id)
            return Response(SubstituteLogSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = SubstituteLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        log = serializer.save()
        return Response(SubstituteLogSerializer(log).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_substitutes_view(request):
    """
    Returns teachers who are free at a given day + time slot.
    Query params: day (1-6), start_time (HH:MM), end_time (HH:MM)
    """
    try:
        day = request.query_params.get("day")
        start_time = request.query_params.get("start_time")
        end_time = request.query_params.get("end_time")

        if not all([day, start_time, end_time]):
            return Response(
                {"error": "day, start_time and end_time are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        busy_teacher_ids = Period.objects.filter(
            timetable__day_of_week=day,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).values_list("teacher_id", flat=True)

        available = User.objects.filter(
            role__name="teacher"
        ).exclude(id__in=busy_teacher_ids)

        from apps.accounts.serializers import UserSerializer
        return Response(UserSerializer(available, many=True).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
