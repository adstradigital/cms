import secrets
import string
from django.db import transaction
from django.db import models
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Staff, TeacherDetail, StaffAttendance, StaffLeaveRequest, StaffTask, TeacherLeaderboardSnapshot
from .serializers import StaffSerializer, TeacherDetailSerializer, StaffCreateSerializer, StaffUpdateSerializer, StaffAttendanceSerializer, StaffLeaveRequestSerializer, StaffTaskSerializer, TeacherLeaderboardSnapshotSerializer
from django.utils import timezone
from apps.accounts.models import User
from apps.permissions.models import Role as RoleV2

def _random_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def staff_list_view(request):
    """List all staff with optional role filtering."""
    if request.method == "GET":
        q = request.query_params.get('q')
        status_filter = request.query_params.get('status')
        role_filter = request.query_params.get('role')  # teacher | non_teacher
        role_id = request.query_params.get('role_id')
        qs = Staff.objects.select_related("user", "user__role").all()

        if role_filter == 'teacher':
            qs = qs.filter(is_teaching_staff=True)
        elif role_filter == 'non_teacher':
            qs = qs.filter(is_teaching_staff=False)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if role_id:
            qs = qs.filter(user__role_id=role_id)
        if q:
            qs = qs.filter(
                models.Q(employee_id__icontains=q) |
                models.Q(user__first_name__icontains=q) |
                models.Q(user__last_name__icontains=q) |
                models.Q(user__email__icontains=q) |
                models.Q(user__phone__icontains=q)
            )

        serializer = StaffSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = StaffCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data

    username = data.get("username") or (data.get("email") or "").split("@")[0] or f"staff_{data['employee_id']}"
    email = data.get("email") or ""
    phone = data.get("phone") or ""
    role_id = data.get("role")
    role = RoleV2.objects.filter(pk=role_id).first() if role_id else None

    with transaction.atomic():
        user = User.objects.create(
            username=username,
            first_name=data["first_name"],
            last_name=data.get("last_name") or "",
            email=email,
            phone=phone,
            portal="admin",
            school=request.user.school,
            role=role,
        )
        user.set_password(data["password"])
        user.save()

        # Handle auto-generation of employee_id if not provided
        emp_id = data.get("employee_id")
        if not emp_id:
            emp_id = Staff.generate_next_id()

        staff = Staff.objects.create(
            user=user,
            employee_id=emp_id,
            designation=data["designation"],
            joining_date=data["joining_date"],
            status=data.get("status") or "active",
            is_teaching_staff=data.get("is_teaching_staff", True),
        )
        if staff.is_teaching_staff:
            TeacherDetail.objects.get_or_create(
                staff=staff,
                defaults={
                    "specialization": data.get("specialization", ""),
                    "bio": data.get("bio", ""),
                },
            )

    return Response(StaffSerializer(staff).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def teacher_list_view(request):
    """Detailed teacher list with academic allocations."""
    qs = Staff.objects.select_related("user", "user__role").filter(is_teaching_staff=True)
    serializer = StaffSerializer(qs, many=True)
    
    # Enrich with teacher detail if needed
    return Response(serializer.data)

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def staff_detail_view(request, pk):
    try:
        staff = Staff.objects.select_related("user", "user__role").get(pk=pk)
    except Staff.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        serializer = StaffSerializer(staff)
        # Include teacher details if applicable
        data = serializer.data
        if staff.is_teaching_staff and hasattr(staff, 'teacher_detail'):
            data['teacher_info'] = TeacherDetailSerializer(staff.teacher_detail).data
        return Response(data)
        
    elif request.method == 'PATCH':
        serializer = StaffUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        if "status" in data:
            staff.status = data["status"]
        if "designation" in data:
            staff.designation = data["designation"]
        if "is_teaching_staff" in data:
            staff.is_teaching_staff = data["is_teaching_staff"]

        if "role" in data:
            staff.user.role_id = data["role"]
        if "is_active" in data:
            staff.user.is_active = data["is_active"]
        staff.user.save()
        staff.save()
        return Response(StaffSerializer(staff).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def staff_reset_credentials_view(request, pk):
    try:
        staff = Staff.objects.select_related("user").get(pk=pk)
    except Staff.DoesNotExist:
        return Response({"error": "Staff not found."}, status=status.HTTP_404_NOT_FOUND)

    temp_password = _random_password(12)
    staff.user.set_password(temp_password)
    staff.user.save(update_fields=["password"])
    return Response({"username": staff.user.username, "temp_password": temp_password}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def staff_attendance_view(request):
    if request.method == 'GET':
        qs = StaffAttendance.objects.all()
        serializer = StaffAttendanceSerializer(qs, many=True)
        return Response(serializer.data)
    
    # POST - Clock In / Clock Out
    action = request.data.get('action')
    try:
        staff = request.user.staff_profile
    except:
        return Response({"error": "Not a staff member"}, status=status.HTTP_403_FORBIDDEN)
        
    date_today = timezone.now().date()
    attendance, created = StaffAttendance.objects.get_or_create(staff=staff, date=date_today)
    
    if action == 'clock_in':
        if attendance.in_time:
            return Response({"error": "Already clocked in"}, status=status.HTTP_400_BAD_REQUEST)
        attendance.in_time = timezone.now().time()
        attendance.status = 'present'
        # Simple late logic: if after 9:00 AM
        if attendance.in_time.hour >= 9:
            attendance.is_late = True
        attendance.save()
    elif action == 'clock_out':
        if not attendance.in_time:
            return Response({"error": "Clock in first"}, status=status.HTTP_400_BAD_REQUEST)
        attendance.out_time = timezone.now().time()
        attendance.save()
    else:
        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        
    serializer = StaffAttendanceSerializer(attendance)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def staff_leave_view(request):
    if request.method == 'GET':
        qs = StaffLeaveRequest.objects.all()
        serializer = StaffLeaveRequestSerializer(qs, many=True)
        return Response(serializer.data)
        
    # Apply for leave
    try:
        staff = request.user.staff_profile
    except:
        return Response({"error": "Not a staff member"}, status=status.HTTP_403_FORBIDDEN)
        
    data = request.data.copy()
    data['staff'] = staff.id
    serializer = StaffLeaveRequestSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def staff_leave_detail_view(request, pk):
    try:
        leave = StaffLeaveRequest.objects.get(pk=pk)
    except StaffLeaveRequest.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
        
    data = request.data
    if 'status' in data:
        leave.status = data['status']
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.save()
        
        # If approved, auto mark attendance
        if leave.status == 'approved':
            import datetime
            current_date = leave.from_date
            while current_date <= leave.to_date:
                StaffAttendance.objects.update_or_create(
                    staff=leave.staff,
                    date=current_date,
                    defaults={'status': 'on_leave'}
                )
                current_date += datetime.timedelta(days=1)
                
    return Response(StaffLeaveRequestSerializer(leave).data)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def staff_task_view(request):
    if request.method == 'GET':
        qs = StaffTask.objects.all()
        serializer = StaffTaskSerializer(qs, many=True)
        return Response(serializer.data)
        
    serializer = StaffTaskSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(assigned_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def staff_task_detail_view(request, pk):
    try:
        task = StaffTask.objects.get(pk=pk)
    except StaffTask.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    serializer = StaffTaskSerializer(task, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def teacher_leaderboard_view(request):
    qs = TeacherLeaderboardSnapshot.objects.all().order_by('-composite_score')
    serializer = TeacherLeaderboardSnapshotSerializer(qs, many=True)
    return Response(serializer.data)

