from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from decimal import Decimal

from apps.students.models import Student
from .models import (
    Exam, ExamSchedule, ExamResult, HallTicket, ReportCard,
    ExamType, ReportTemplate, QuestionBank, QuestionPaper, OnlineTestAttempt, StudentAnswer
)
from .serializers import (
    ExamSerializer, ExamScheduleSerializer, ExamResultSerializer,
    HallTicketSerializer, ReportCardSerializer, ExamTypeSerializer,
    ReportTemplateSerializer, QuestionBankSerializer, QuestionPaperSerializer, OnlineTestAttemptSerializer
)


# ─── Exam Types & Configurations ───────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def exam_type_list_view(request):
    try:
        if request.method == "GET":
            qs = ExamType.objects.all()
            return Response(ExamTypeSerializer(qs, many=True).data, status=status.HTTP_200_OK)
        
        serializer = ExamTypeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Exam ─────────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def exam_list_view(request):
    try:
        if request.method == "GET":
            academic_year_id = request.query_params.get("academic_year")
            class_id = request.query_params.get("class")
            qs = Exam.objects.select_related("academic_year", "school_class", "exam_type").all()
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            if class_id:
                qs = qs.filter(school_class_id=class_id)
            return Response(ExamSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ExamSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def exam_detail_view(request, pk):
    try:
        try:
            exam = Exam.objects.select_related("academic_year", "school_class").get(pk=pk)
        except Exam.DoesNotExist:
            return Response({"error": "Exam not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(ExamSerializer(exam).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = ExamSerializer(exam, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        exam.delete()
        return Response({"message": "Exam deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def exam_publish_view(request, pk):
    try:
        try:
            exam = Exam.objects.get(pk=pk)
        except Exam.DoesNotExist:
            return Response({"error": "Exam not found."}, status=status.HTTP_404_NOT_FOUND)
        exam.is_published = True
        exam.save()
        return Response({"message": "Exam published successfully."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Exam Schedule ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def exam_schedule_list_view(request, exam_pk):
    try:
        if request.method == "GET":
            schedules = ExamSchedule.objects.select_related("subject", "exam").filter(exam_id=exam_pk)
            return Response(ExamScheduleSerializer(schedules, many=True).data, status=status.HTTP_200_OK)

        data = {**request.data, "exam": exam_pk}
        serializer = ExamScheduleSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exam_schedule_global_list_view(request):
    """
    Returns all exam schedules for the global timetable.
    """
    try:
        schedules = ExamSchedule.objects.select_related("subject", "exam", "exam__school_class").all()
        return Response(ExamScheduleSerializer(schedules, many=True).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Question Bank & Papers ───────────────────────────────────────────────────

from rest_framework.pagination import PageNumberPagination

class QuestionBankPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def question_bank_list_view(request):
    try:
        if request.method == "GET":
            subject_id = request.query_params.get("subject")
            search = request.query_params.get("search")
            qs = QuestionBank.objects.all().order_by("-created_at")
            if subject_id:
                qs = qs.filter(subject_id=subject_id)
            if search:
                qs = qs.filter(text__icontains=search)
            
            paginator = QuestionBankPagination()
            page = paginator.paginate_queryset(qs, request)
            if page is not None:
                serializer = QuestionBankSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            serializer = QuestionBankSerializer(qs, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        serializer = QuestionBankSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def question_paper_list_view(request):
    try:
        if request.method == "GET":
            qs = QuestionPaper.objects.all()
            return Response(QuestionPaperSerializer(qs, many=True).data, status=status.HTTP_200_OK)
        
        serializer = QuestionPaperSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Exam Results (Marks Entry) ───────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def exam_result_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            exam_id = request.query_params.get("exam")
            section_id = request.query_params.get("section")
            qs = ExamResult.objects.select_related(
                "student", "student__user", "exam_schedule", "exam_schedule__subject"
            ).all()
            if student_id:
                qs = qs.filter(student_id=student_id)
            if exam_id:
                qs = qs.filter(exam_schedule__exam_id=exam_id)
            if section_id:
                qs = qs.filter(student__section_id=section_id)
            return Response(ExamResultSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ExamResultSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        result = serializer.save(entered_by=request.user)
        return Response(ExamResultSerializer(result).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def exam_result_bulk_view(request):
    """Bulk upload marks: [{student_id, exam_schedule_id, theory_marks, internal_marks, is_absent, remarks}]"""
    try:
        records = request.data.get("records", [])
        if not records:
            return Response({"error": "No records provided."}, status=status.HTTP_400_BAD_REQUEST)

        created, updated, errors = 0, 0, []

        for record in records:
            try:
                student_id = record["student_id"]
                schedule_id = record["exam_schedule_id"]
                theory = record.get("theory_marks")
                internal = record.get("internal_marks")
                total = None
                if theory is not None and internal is not None:
                    total = float(theory) + float(internal)
                elif theory is not None:
                    total = float(theory)

                obj, was_created = ExamResult.objects.update_or_create(
                    student_id=student_id,
                    exam_schedule_id=schedule_id,
                    defaults={
                        "theory_marks": theory,
                        "internal_marks": internal,
                        "marks_obtained": total,
                        "is_absent": record.get("is_absent", False),
                        "remarks": record.get("remarks", ""),
                        "entered_by": request.user,
                    },
                )
                created += 1 if was_created else 0
                updated += 0 if was_created else 1
            except Exception as ex:
                errors.append({"record": record, "error": str(ex)})

        return Response({
            "message": f"Results saved. Created: {created}, Updated: {updated}.",
            "errors": errors,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Hall Ticket ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hall_ticket_list_view(request):
    try:
        if request.method == "GET":
            exam_id = request.query_params.get("exam")
            student_id = request.query_params.get("student")
            qs = HallTicket.objects.select_related("student", "student__user", "exam").all()
            if exam_id:
                qs = qs.filter(exam_id=exam_id)
            if student_id:
                qs = qs.filter(student_id=student_id)
            return Response(HallTicketSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = HallTicketSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Report Templates & Cards ─────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def report_template_list_view(request):
    try:
        if request.method == "GET":
            qs = ReportTemplate.objects.all()
            return Response(ReportTemplateSerializer(qs, many=True).data, status=status.HTTP_200_OK)
            
        serializer = ReportTemplateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def report_card_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            exam_id = request.query_params.get("exam")
            section_id = request.query_params.get("section")
            qs = ReportCard.objects.select_related("student", "student__user", "exam").all()
            if student_id:
                qs = qs.filter(student_id=student_id)
            if exam_id:
                qs = qs.filter(exam_id=exam_id)
            if section_id:
                qs = qs.filter(student__section_id=section_id)
            return Response(ReportCardSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ReportCardSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calculate_exam_stats_view(request, exam_pk):
    """Calculate total marks, percentage, and rank for all students in an exam."""
    try:
        # Simplified implementation of ranks
        schedules = ExamSchedule.objects.filter(exam_id=exam_pk)
        total_max_marks = schedules.aggregate(
            tMax=Sum("max_theory_marks"), iMax=Sum("max_internal_marks")
        )
        total_max = (total_max_marks["tMax"] or 0) + (total_max_marks["iMax"] or 0)
        
        if total_max == 0:
            return Response({"error": "No exam schedules found for this exam."}, status=status.HTTP_400_BAD_REQUEST)

        results = ExamResult.objects.filter(exam_schedule__exam_id=exam_pk)
        student_ids = results.values_list("student_id", flat=True).distinct()

        report_cards = []
        for student_id in student_ids:
            student_results = results.filter(student_id=student_id)
            total_obtained = student_results.aggregate(Sum("marks_obtained"))["marks_obtained__sum"] or 0
            percentage = (Decimal(total_obtained) / Decimal(total_max)) * 100
            
            # Simple grade logic
            if percentage >= 90: grade = "A1"
            elif percentage >= 80: grade = "A2"
            elif percentage >= 70: grade = "B1"
            elif percentage >= 60: grade = "B2"
            elif percentage >= 50: grade = "C1"
            else: grade = "D"

            rc, _ = ReportCard.objects.update_or_create(
                student_id=student_id,
                exam_id=exam_pk,
                defaults={
                    "total_marks": total_obtained,
                    "percentage": percentage,
                    "grade": grade,
                }
            )
            report_cards.append(rc)

        sorted_rcs = sorted(report_cards, key=lambda x: x.percentage, reverse=True)
        for i, rc in enumerate(sorted_rcs):
            rc.rank = i + 1
            rc.save()

        return Response({"message": f"Calculated stats for {len(report_cards)} students."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ─── Analytics ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exam_analytics_view(request):
    try:
        exam_id = request.query_params.get("exam")
        if not exam_id:
            return Response({"error": "Exam ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Overall Pass Rate
        total_results = ExamResult.objects.filter(exam_schedule__exam_id=exam_id).count()
        if total_results == 0:
            return Response({"message": "No data found for this exam."}, status=status.HTTP_200_OK)

        # Assuming pass marks is a percentage in ExamSchedule
        # Or absolute marks. Let's assume it's absolute for simplicity or calc it.
        passed_results = ExamResult.objects.filter(
            exam_schedule__exam_id=exam_id,
            marks_obtained__gte=F('exam_schedule__pass_marks')
        ).count()
        
        pass_rate = (passed_results / total_results) * 100 if total_results > 0 else 0

        # 2. Subject Performance
        subject_stats = ExamResult.objects.filter(exam_schedule__exam_id=exam_id).values(
            'exam_schedule__subject__name'
        ).annotate(
            avg_score=Avg('marks_obtained'),
            max_score=Max('marks_obtained'),
            min_score=Min('marks_obtained'),
            pass_count=Count('id', filter=Q(marks_obtained__gte=F('exam_schedule__pass_marks')))
        ).order_by('-avg_score')

        top_subject = subject_stats[0]['exam_schedule__subject__name'] if subject_stats else "N/A"
        
        # 3. Class-wise performance (heatmap data)
        class_stats = ExamResult.objects.filter(exam_schedule__exam_id=exam_id).values(
            'student__section__class_name__name', 'exam_schedule__subject__name'
        ).annotate(
            avg_score=Avg('marks_obtained')
        ).order_by('student__section__class_name__name')

        return Response({
            "overall_pass_rate": round(pass_rate, 2),
            "total_students_count": total_results,
            "top_subject": top_subject,
            "subject_performance": list(subject_stats),
            "class_performance": list(class_stats)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
