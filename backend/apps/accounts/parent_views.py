from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta

from .models import User, Parent
from apps.students.models import Student
from apps.attendance.models import Attendance
from apps.fees.models import FeePayment, FeeStructure
from apps.exams.models import ExamResult, ReportCard, Exam
from apps.academics.models import Homework
from apps.notifications.models import Notification
from .serializers import UserSerializer, ParentSerializer
from apps.students.serializers import StudentSerializer
from apps.exams.serializers import ExamResultSerializer, ReportCardSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def parent_stats_view(request):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            return Response({"error": "Parent profile not found."}, status=status.HTTP_404_NOT_FOUND)

        children = parent.students.all()
        child_ids = children.values_list('id', flat=True)

        # 1. Attendance Summary
        total_attendance = Attendance.objects.filter(student_id__in=child_ids).count()
        present_count = Attendance.objects.filter(student_id__in=child_ids, status='present').count()
        attendance_pct = (present_count / total_attendance * 100) if total_attendance > 0 else 0

        # 2. Fee Summary
        total_due = FeePayment.objects.filter(student_id__in=child_ids).exclude(status='paid').count()
        
        # 3. Notices (Bulletin)
        notices = Notification.objects.filter(
            Q(target_audience='parents') | Q(target_audience='all'),
            is_published=True
        ).order_by('-is_pinned', '-created_at')[:5]
        
        notices_data = [{
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "type": n.notification_type,
            "created_at": n.created_at
        } for n in notices]

        return Response({
            "parent_name": request.user.get_full_name() or request.user.username,
            "children_count": children.count(),
            "attendance_percentage": round(attendance_pct, 2),
            "pending_fees_count": total_due,
            "notices": notices_data,
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({
            "error": str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def parent_children_view(request):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            return Response({"error": "Parent profile not found."}, status=status.HTTP_404_NOT_FOUND)

        children = parent.students.select_related('section__school_class', 'user').all()
        # Add a computed full_name field for convenience
        data = []
        for child in children:
            student_data = StudentSerializer(child).data
            student_data['full_name'] = f"{child.user.first_name} {child.user.last_name}"
            data.append(student_data)
        return Response(data)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def child_progress_view(request, child_id):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent or not parent.students.filter(id=child_id).exists():
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        student = Student.objects.select_related('section__school_class').get(pk=child_id)
        results = ExamResult.objects.filter(student=student).select_related('exam_schedule__exam', 'exam_schedule__subject')
        results_data = ExamResultSerializer(results, many=True).data

        school_class = student.section.school_class if (student.section and student.section.school_class) else None
        if not school_class:
            return Response({"results": results_data, "gpa_trends": [], "report_cards": []})

        exams = Exam.objects.filter(school_class=school_class, is_published=True)
        trends = []
        for exam in exams:
            exam_results = results.filter(exam_schedule__exam=exam)
            if exam_results.exists():
                avg_pct = exam_results.aggregate(avg=Avg('marks_obtained'))['avg']
                trends.append({
                    "exam_name": exam.name,
                    "percentage": round(float(avg_pct), 2) if avg_pct else 0
                })

        report_cards = ReportCard.objects.filter(student=student, is_published=True)
        reports_data = ReportCardSerializer(report_cards, many=True).data

        return Response({
            "results": results_data,
            "gpa_trends": trends,
            "report_cards": reports_data
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def child_attendance_view(request, child_id):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent or not parent.students.filter(id=child_id).exists():
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)

        attendance = Attendance.objects.filter(
            student_id=child_id,
            date__month=month,
            date__year=year
        ).order_by('-date')

        logs = [{
            "date": a.date,
            "status": a.status,
            "subject": a.subject.name if a.subject else "General",
            "remarks": a.remarks
        } for a in attendance]

        summary = attendance.values('status').annotate(count=Count('id'))

        return Response({
            "logs": logs,
            "summary": {item['status']: item['count'] for item in summary}
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def child_fees_view(request, child_id):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent or not parent.students.filter(id=child_id).exists():
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        student = Student.objects.select_related('section__school_class').get(pk=child_id)
        school_class = student.section.school_class if (student.section and student.section.school_class) else None
        
        if not school_class:
            return Response({"ledger": [], "summary": {"total_paid": 0, "total_pending": 0}})

        structures = FeeStructure.objects.filter(school_class=school_class)
        payments = FeePayment.objects.filter(student=student).select_related('fee_structure__category')
        
        ledger = []
        for p in payments:
            ledger.append({
                "id": p.id,
                "category": p.fee_structure.category.name,
                "amount": float(p.amount_paid),
                "due_date": p.fee_structure.due_date,
                "status": p.status,
                "date": p.payment_date,
                "receipt": p.receipt_number
            })

        summary = {
            "total_paid": float(payments.filter(status='paid').aggregate(total=Sum('amount_paid'))['total'] or 0),
            "total_pending": float(payments.exclude(status='paid').aggregate(total=Sum('fee_structure__amount'))['total'] or 0),
        }

        return Response({
            "ledger": ledger,
            "summary": summary
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def child_homework_view(request, child_id):
    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent or not parent.students.filter(id=child_id).exists():
            return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)

        student = Student.objects.get(pk=child_id)
        if not student.section:
            return Response({"homework": []})

        homework = Homework.objects.filter(section=student.section).select_related('subject', 'assigned_by').order_by('-created_at')
        
        data = []
        for h in homework:
            data.append({
                "id": h.id,
                "title": h.title,
                "description": h.description,
                "subject": h.subject.name if h.subject else "General",
                "due_date": h.due_date,
                "assigned_by": h.assigned_by.get_full_name() if h.assigned_by else "Teacher",
                "created_at": h.created_at,
                "has_submission": h.submissions.filter(student=student).exists()
            })

        return Response({"homework": data})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
