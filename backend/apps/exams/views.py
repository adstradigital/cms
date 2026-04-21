from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Avg, Count, F, Q, Max, Min

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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def exam_schedule_detail_view(request, pk):
    try:
        try:
            schedule = ExamSchedule.objects.get(pk=pk)
        except ExamSchedule.DoesNotExist:
            return Response({"error": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(ExamScheduleSerializer(schedule).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = ExamScheduleSerializer(schedule, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        schedule.delete()
        return Response({"message": "Schedule deleted."}, status=status.HTTP_204_NO_CONTENT)
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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def question_bank_detail_view(request, pk):
    try:
        try:
            question = QuestionBank.objects.get(pk=pk)
        except QuestionBank.DoesNotExist:
            return Response({"error": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(QuestionBankSerializer(question).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = QuestionBankSerializer(question, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        question.delete()
        return Response({"message": "Question deleted."}, status=status.HTTP_204_NO_CONTENT)
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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def question_paper_detail_view(request, pk):
    try:
        try:
            paper = QuestionPaper.objects.get(pk=pk)
        except QuestionPaper.DoesNotExist:
            return Response({"error": "Question paper not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(QuestionPaperSerializer(paper).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = QuestionPaperSerializer(paper, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        paper.delete()
        return Response({"message": "Question paper deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def question_bank_bulk_delete_view(request):
    try:
        # Check if user is admin (portal == 'admin' or is_superuser)
        if request.user.portal != "admin" and not request.user.is_superuser:
             return Response({"error": "Only admins can perform bulk deletion."}, status=status.HTTP_403_FORBIDDEN)
        
        subject_id = request.data.get("subject")
        reason = request.data.get("reason")
        
        if not subject_id:
            return Response({"error": "Subject ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not reason or len(reason) < 10:
            return Response({"error": "A valid reason (min 10 characters) is required to wipe the question bank."}, status=status.HTTP_400_BAD_REQUEST)
            
        questions = QuestionBank.objects.filter(subject_id=subject_id)
        count = questions.count()
        questions.delete()
        
        return Response({
            "message": f"Successfully wiped {count} questions for the selected subject.",
            "count": count
        }, status=status.HTTP_200_OK)
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


# ─── Online Test v2 Views ─────────────────────────────────────────────────────

from .models import OnlineTest, TestQuestion, TestChoice, TestAttempt, TestAnswer
from .serializers import (
    OnlineTestSerializer, OnlineTestListSerializer,
    TestQuestionSerializer, TestAttemptSerializer, TestAttemptListSerializer,
    TestAnswerSerializer,
)
from .services import auto_grade_attempt, compute_attempt_scores
from django.utils import timezone


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def online_test_list_view(request):
    """List all online tests or create a new one."""
    try:
        if request.method == "GET":
            section_id = request.query_params.get("section")
            subject_id = request.query_params.get("subject")
            qs = OnlineTest.objects.select_related("section", "subject", "created_by__user").all()
            if section_id:
                qs = qs.filter(section_id=section_id)
            if subject_id:
                qs = qs.filter(subject_id=subject_id)
            return Response(OnlineTestListSerializer(qs, many=True).data)

        serializer = OnlineTestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # Auto-set created_by from staff profile
        staff = getattr(request.user, "staff_profile", None)
        serializer.save(created_by=staff)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def online_test_detail_view(request, pk):
    """Get, update, or delete a specific online test."""
    try:
        test = OnlineTest.objects.select_related("section", "subject", "created_by__user").prefetch_related(
            "test_questions__choices"
        ).get(pk=pk)
    except OnlineTest.DoesNotExist:
        return Response({"error": "Test not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(OnlineTestSerializer(test).data)

    if request.method == "PATCH":
        serializer = OnlineTestSerializer(test, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    test.delete()
    return Response({"message": "Test deleted."}, status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def online_test_publish_view(request, pk):
    """Publish a test so students can see it."""
    try:
        test = OnlineTest.objects.get(pk=pk)
    except OnlineTest.DoesNotExist:
        return Response({"error": "Test not found."}, status=status.HTTP_404_NOT_FOUND)

    if test.test_questions.exclude(question_type="divider").count() == 0:
        return Response({"error": "Cannot publish a test with no questions."}, status=status.HTTP_400_BAD_REQUEST)

    test.is_published = not test.is_published  # Toggle
    test.save(update_fields=["is_published"])
    action = "published" if test.is_published else "unpublished"
    return Response({"message": f"Test {action} successfully.", "is_published": test.is_published})


# ─── Questions ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def test_question_list_view(request, test_pk):
    """List or add questions to a test."""
    try:
        test = OnlineTest.objects.get(pk=test_pk)
    except OnlineTest.DoesNotExist:
        return Response({"error": "Test not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        questions = test.test_questions.prefetch_related("choices").all()
        return Response(TestQuestionSerializer(questions, many=True).data)

    data = {**request.data, "test": test.id}
    # Auto-set order if not provided
    if "order" not in data:
        max_order = test.test_questions.aggregate(m=Max("order"))["m"] or 0
        data["order"] = max_order + 1

    serializer = TestQuestionSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def test_question_detail_view(request, pk):
    """Edit or delete a single question."""
    try:
        question = TestQuestion.objects.prefetch_related("choices").get(pk=pk)
    except TestQuestion.DoesNotExist:
        return Response({"error": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "PATCH":
        serializer = TestQuestionSerializer(question, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    question.delete()
    return Response({"message": "Question deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─── Attempts (Student) ──────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_start_attempt_view(request, test_pk):
    """Student starts a new attempt."""
    try:
        test = OnlineTest.objects.get(pk=test_pk)
    except OnlineTest.DoesNotExist:
        return Response({"error": "Test not found."}, status=status.HTTP_404_NOT_FOUND)

    if not test.is_published:
        return Response({"error": "This test is not published yet."}, status=status.HTTP_400_BAD_REQUEST)

    # Find the student
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response({"error": "Student profile not found."}, status=status.HTTP_403_FORBIDDEN)

    # Check for an existing in-progress attempt to resume
    in_progress_attempt = TestAttempt.objects.filter(
        test=test, 
        student=student, 
        status="in_progress"
    ).first()
    
    if in_progress_attempt:
        return Response(TestAttemptSerializer(in_progress_attempt).data, status=status.HTTP_200_OK)

    # Check attempt limit for NEW attempts
    existing_attempts = TestAttempt.objects.filter(test=test, student=student).count()
    if existing_attempts >= test.max_attempts:
        return Response({"error": f"Maximum attempts ({test.max_attempts}) reached."}, status=status.HTTP_400_BAD_REQUEST)

    # Check time window
    now = timezone.now()
    if test.start_at and now < test.start_at:
        return Response({"error": "This test has not started yet."}, status=status.HTTP_400_BAD_REQUEST)
    if test.end_at and now > test.end_at:
        return Response({"error": "This test has already ended."}, status=status.HTTP_400_BAD_REQUEST)

    attempt = TestAttempt.objects.create(
        test=test,
        student=student,
        attempt_number=existing_attempts + 1,
    )

    # Pre-create empty answer slots for each question
    for q in test.test_questions.exclude(question_type="divider"):
        TestAnswer.objects.create(attempt=attempt, question=q)

    return Response(TestAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_submit_attempt_view(request, attempt_pk):
    """Student submits their attempt. Triggers auto-grading."""
    try:
        attempt = TestAttempt.objects.select_related("test").get(pk=attempt_pk)
    except TestAttempt.DoesNotExist:
        return Response({"error": "Attempt not found."}, status=status.HTTP_404_NOT_FOUND)

    if attempt.status != "in_progress":
        return Response({"error": "This attempt has already been submitted."}, status=status.HTTP_400_BAD_REQUEST)

    # Save any answers from the request body
    answers_data = request.data.get("answers", [])
    for ans_data in answers_data:
        try:
            answer = attempt.answers.get(question_id=ans_data.get("question"))
            if "text_answer" in ans_data:
                answer.text_answer = ans_data["text_answer"]
            if "selected_choice_ids" in ans_data:
                answer.selected_choices.set(ans_data["selected_choice_ids"])
            answer.save()
        except TestAnswer.DoesNotExist:
            continue

    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=["submitted_at"])

    # Run auto-grading
    auto_grade_attempt(attempt)

    # If auto-only and instant visibility, publish immediately
    if attempt.test.grading_mode == "auto" and attempt.test.result_visibility == "instant":
        attempt.status = "published"
        attempt.save(update_fields=["status"])

    attempt.refresh_from_db()
    return Response(TestAttemptSerializer(attempt).data)


# ─── Submissions & Grading (Teacher) ─────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def test_submissions_view(request, test_pk):
    """Teacher views all submissions for a test."""
    try:
        test = OnlineTest.objects.get(pk=test_pk)
    except OnlineTest.DoesNotExist:
        return Response({"error": "Test not found."}, status=status.HTTP_404_NOT_FOUND)

    status_filter = request.query_params.get("status")
    qs = test.attempts.select_related("student__user").all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    return Response(TestAttemptListSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def test_attempt_detail_view(request, attempt_pk):
    """Get full attempt with all answers (for teacher grading view)."""
    try:
        attempt = TestAttempt.objects.select_related(
            "test", "student__user"
        ).prefetch_related(
            "answers__question__choices", "answers__selected_choices"
        ).get(pk=attempt_pk)
    except TestAttempt.DoesNotExist:
        return Response({"error": "Attempt not found."}, status=status.HTTP_404_NOT_FOUND)

    # Security: Only allow student to see their own attempt, or staff to see all
    if not request.user.is_staff:
        # Check if student exists and belongs to this user
        student = Student.objects.filter(user=request.user).first()
        if not student or attempt.student != student:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

    return Response(TestAttemptSerializer(attempt).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def test_grade_answer_view(request, answer_pk):
    """Teacher grades a single answer (manual score + remark)."""
    try:
        answer = TestAnswer.objects.select_related("attempt").get(pk=answer_pk)
    except TestAnswer.DoesNotExist:
        return Response({"error": "Answer not found."}, status=status.HTTP_404_NOT_FOUND)

    if "manual_score" in request.data:
        answer.manual_score = request.data["manual_score"]
    if "teacher_remark" in request.data:
        answer.teacher_remark = request.data["teacher_remark"]
    if "is_correct" in request.data:
        answer.is_correct = request.data["is_correct"]

    answer.save()

    # Recompute attempt totals
    compute_attempt_scores(answer.attempt)

    return Response(TestAnswerSerializer(answer).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_publish_result_view(request, attempt_pk):
    """Publish a graded attempt's result to the student."""
    try:
        attempt = TestAttempt.objects.get(pk=attempt_pk)
    except TestAttempt.DoesNotExist:
        return Response({"error": "Attempt not found."}, status=status.HTTP_404_NOT_FOUND)

    attempt.status = "published"
    attempt.save(update_fields=["status"])
    return Response({"message": "Result published.", "status": "published"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_test_attempts_view(request):
    """Students list their own test attempts."""
    try:
        student = Student.objects.filter(user=request.user).first()
        if not student:
            return Response({"error": "Student profile not found."}, status=status.HTTP_403_FORBIDDEN)

        qs = TestAttempt.objects.filter(student=student).select_related("test", "test__subject")
        return Response(TestAttemptListSerializer(qs, many=True).data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

