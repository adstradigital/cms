from django.utils import timezone
from collections import defaultdict
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.students.models import Student
from apps.academics.models import Subject
from .models import Attendance, LeaveRequest, AttendanceWarning
from .serializers import (
    AttendanceSerializer,
    BulkAttendanceSerializer,
    LeaveRequestSerializer,
    AttendanceWarningSerializer,
)


# ─── Attendance ───────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_list_view(request):
    try:
        student_id = request.query_params.get("student")
        section_id = request.query_params.get("section")
        subject_id = request.query_params.get("subject")
        date = request.query_params.get("date")
        month = request.query_params.get("month")
        year = request.query_params.get("year")

        qs = Attendance.objects.select_related(
            "student", "student__user", "subject", "marked_by"
        ).all()

        if student_id:
            qs = qs.filter(student_id=student_id)
        if section_id:
            qs = qs.filter(student__section_id=section_id)
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        if date:
            qs = qs.filter(date=date)
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)

        return Response(AttendanceSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def attendance_bulk_mark_view(request):
    """
    Mark attendance for an entire section in one call.
    Body: { section, subject (opt), date, records: [{student_id, status, remarks}] }
    """
    try:
        serializer = BulkAttendanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        date = data["date"]
        subject_id = data.get("subject")
        records = data["records"]

        created, updated = 0, 0
        errors = []

        for record in records:
            student_id = record.get("student_id")
            att_status = record.get("status", "present")
            remarks = record.get("remarks", "")

            if not student_id:
                errors.append({"record": record, "error": "student_id is required."})
                continue

            try:
                student = Student.objects.get(pk=student_id)
            except Student.DoesNotExist:
                errors.append({"record": record, "error": f"Student {student_id} not found."})
                continue

            obj, was_created = Attendance.objects.update_or_create(
                student=student,
                subject_id=subject_id,
                date=date,
                defaults={
                    "status": att_status,
                    "remarks": remarks,
                    "marked_by": request.user,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        return Response({
            "message": f"Attendance saved. Created: {created}, Updated: {updated}.",
            "errors": errors,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_summary_view(request, student_id):
    """Monthly summary for a student: total, present, absent, percentage."""
    try:
        month = request.query_params.get("month", timezone.now().month)
        year = request.query_params.get("year", timezone.now().year)

        qs = Attendance.objects.filter(student_id=student_id, date__month=month, date__year=year)

        total = qs.count()
        present = qs.filter(status="present").count()
        absent = qs.filter(status="absent").count()
        late = qs.filter(status="late").count()
        leave = qs.filter(status="leave").count()
        percentage = round((present / total) * 100, 2) if total > 0 else 0

        return Response({
            "student_id": student_id,
            "month": month,
            "year": year,
            "total": total,
            "present": present,
            "absent": absent,
            "late": late,
            "leave": leave,
            "percentage": percentage,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Leave Request ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def leave_request_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            leave_status = request.query_params.get("status")
            class_id = request.query_params.get("class")
            section_id = request.query_params.get("section")
            leave_type = request.query_params.get("leave_type")
            from_date = request.query_params.get("from_date")
            to_date = request.query_params.get("to_date")
            received_date = request.query_params.get("received_date")
            qs = LeaveRequest.objects.select_related(
                "student", "student__user", "reviewed_by",
                "student__section", "student__section__school_class"
            ).all()
            if student_id:
                qs = qs.filter(student_id=student_id)
            if leave_status:
                qs = qs.filter(status=leave_status)
            if class_id:
                qs = qs.filter(student__section__school_class_id=class_id)
            if section_id:
                qs = qs.filter(student__section_id=section_id)
            if leave_type:
                qs = qs.filter(leave_type=leave_type)
            if received_date:
                qs = qs.filter(created_at__date=received_date)
            if from_date:
                qs = qs.filter(from_date__gte=from_date)
            if to_date:
                qs = qs.filter(to_date__lte=to_date)
            qs = qs.order_by("-created_at")
            return Response(LeaveRequestSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = LeaveRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def leave_request_review_view(request, pk):
    """Approve or reject a leave request."""
    try:
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({"error": "Leave request not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in ["approved", "rejected"]:
            return Response({"error": "Status must be 'approved' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        leave.status = new_status
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.save()

        return Response(LeaveRequestSerializer(leave).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_attendance_overview_view(request):
    """Admin dashboard overview + student-wise monthly attendance snapshot."""
    try:
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        class_id = request.query_params.get("class")
        section_id = request.query_params.get("section")
        date_param = request.query_params.get("date")
        threshold = float(request.query_params.get("threshold", 75))

        students_qs = Student.objects.select_related(
            "user", "user__profile", "section", "section__school_class"
        ).filter(is_active=True)

        if class_id:
            students_qs = students_qs.filter(section__school_class_id=class_id)
        if section_id:
            students_qs = students_qs.filter(section_id=section_id)

        students = list(students_qs)
        student_ids = [s.id for s in students]

        monthly_attendance = Attendance.objects.select_related("student").filter(
            student_id__in=student_ids,
            date__month=month,
            date__year=year,
        )

        # Use date_param if provided, else today
        selected_date = date_param if date_param else timezone.now().date()
        today_attendance = Attendance.objects.filter(
            student_id__in=student_ids,
            date=selected_date,
        )

        status_map = defaultdict(lambda: {"total": 0, "present": 0, "absent": 0, "late": 0, "leave": 0})
        for rec in monthly_attendance:
            row = status_map[rec.student_id]
            row["total"] += 1
            if rec.status in row:
                row[rec.status] += 1

        pending_leave_count_map = defaultdict(int)
        for lr in LeaveRequest.objects.filter(student_id__in=student_ids, status="pending"):
            pending_leave_count_map[lr.student_id] += 1

        warnings_count_map = defaultdict(int)
        for wr in AttendanceWarning.objects.filter(student_id__in=student_ids):
            warnings_count_map[wr.student_id] += 1

        students_data = []
        overall_total = overall_present = 0
        present_today = absent_today = late_today = leave_today = 0
        for rec in today_attendance:
            if rec.status == "present":
                present_today += 1
            elif rec.status == "absent":
                absent_today += 1
            elif rec.status == "late":
                late_today += 1
            elif rec.status == "leave":
                leave_today += 1

        unmarked_today = max(0, len(students) - today_attendance.count())

        today_status_map = {rec.student_id: rec.status for rec in today_attendance}

        for s in students:
            row = status_map[s.id]
            total = row["total"]
            present = row["present"]
            percentage = round((present / total) * 100, 2) if total else 0.0
            low_attendance = percentage < threshold if total else False

            overall_total += total
            overall_present += present

            students_data.append({
                "student_id": s.id,
                "student_name": s.user.get_full_name() or s.user.username,
                "admission_number": s.admission_number,
                "roll_number": s.roll_number,
                "class_name": s.section.school_class.name if s.section else None,
                "section_name": s.section.name if s.section else None,
                "student_phone": s.user.phone or "",
                "student_email": s.user.email or "",
                "parent_phone": getattr(s.user.profile, "parent_phone", "") if hasattr(s.user, "profile") else "",
                "parent_email": getattr(s.user.profile, "parent_email", "") if hasattr(s.user, "profile") else "",
                "total": total,
                "present": present,
                "absent": row["absent"],
                "late": row["late"],
                "leave": row["leave"],
                "percentage": percentage,
                "low_attendance": low_attendance,
                "day_status": today_status_map.get(s.id, "unmarked"),
                "pending_leave_requests": pending_leave_count_map[s.id],
                "warnings_sent": warnings_count_map[s.id],
            })

        overall_percentage = round((overall_present / overall_total) * 100, 2) if overall_total else 0.0

        return Response({
            "month": month,
            "year": year,
            "threshold": threshold,
            "summary": {
                "overall_percentage": overall_percentage,
                "present_today": present_today,
                "absent_today": absent_today,
                "late_today": late_today,
                "leave_today": leave_today,
                "unmarked_today": unmarked_today,
                "student_count": len(students),
                "low_attendance_count": len([x for x in students_data if x["low_attendance"]]),
                "pending_leave_count": sum(pending_leave_count_map.values()),
            },
            "students": students_data,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_student_attendance_detail_view(request, student_id):
    """Detailed attendance, leaves, warnings for one student."""
    try:
        month = int(request.query_params.get("month", timezone.now().month))
        year = int(request.query_params.get("year", timezone.now().year))
        threshold = float(request.query_params.get("threshold", 75))

        try:
            student = Student.objects.select_related("user", "user__profile", "section", "section__school_class").get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        monthly = Attendance.objects.filter(
            student_id=student_id,
            date__month=month,
            date__year=year,
        ).order_by("-date")
        monthly_data = AttendanceSerializer(monthly, many=True).data

        total = monthly.count()
        present = monthly.filter(status="present").count()
        absent = monthly.filter(status="absent").count()
        late = monthly.filter(status="late").count()
        leave = monthly.filter(status="leave").count()
        percentage = round((present / total) * 100, 2) if total else 0.0

        leave_requests = LeaveRequest.objects.filter(student_id=student_id).order_by("-created_at")
        warnings = AttendanceWarning.objects.filter(student_id=student_id).order_by("-created_at")

        return Response({
            "student": {
                "id": student.id,
                "name": student.user.get_full_name() or student.user.username,
                "admission_number": student.admission_number,
                "class_name": student.section.school_class.name if student.section else None,
                "section_name": student.section.name if student.section else None,
                "student_phone": student.user.phone or "",
                "student_email": student.user.email or "",
                "parent_phone": getattr(student.user.profile, "parent_phone", "") if hasattr(student.user, "profile") else "",
                "parent_email": getattr(student.user.profile, "parent_email", "") if hasattr(student.user, "profile") else "",
            },
            "summary": {
                "month": month,
                "year": year,
                "total": total,
                "present": present,
                "absent": absent,
                "late": late,
                "leave": leave,
                "percentage": percentage,
                "low_attendance": percentage < threshold if total else False,
            },
            "attendance_records": monthly_data,
            "leave_requests": LeaveRequestSerializer(leave_requests, many=True).data,
            "warnings": AttendanceWarningSerializer(warnings, many=True).data,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_attendance_warning_view(request):
    """List and send attendance warnings."""
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            qs = AttendanceWarning.objects.select_related("student", "student__user", "sent_by")
            if student_id:
                qs = qs.filter(student_id=student_id)
            qs = qs.order_by("-created_at")
            return Response(AttendanceWarningSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        student_id = request.data.get("student")
        message = request.data.get("message", "").strip()
        threshold = request.data.get("threshold", 75)
        attendance_percentage = request.data.get("attendance_percentage")

        if not student_id:
            return Response({"error": "student is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not message:
            return Response({"error": "message is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        warning = AttendanceWarning.objects.create(
            student=student,
            sent_by=request.user,
            message=message,
            threshold=threshold,
            attendance_percentage=attendance_percentage,
        )
        
        # Check for parent contact info via the profile
        parents_notified = False
        profile = getattr(student.user, 'profile', None)
        if profile and (profile.parent_phone or profile.parent_email):
            parents_notified = True
            
        data = AttendanceWarningSerializer(warning).data
        data["parents_notified"] = parents_notified
        return Response(data, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
