from django.contrib import admin
from .models import Staff, TeacherDetail, StaffAttendance, StaffLeaveRequest, StaffTask, ParentFeedback, TeacherLeaderboardSnapshot, LeavePolicy, LeaveBalance


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'user', 'designation', 'department', 'status', 'is_teaching_staff', 'joining_date')
    list_filter = ('status', 'is_teaching_staff', 'department')
    search_fields = ('employee_id', 'user__first_name', 'user__last_name', 'designation', 'department')


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff', 'date', 'status', 'in_time', 'out_time', 'is_late', 'late_minutes', 'working_hours', 'overtime')
    list_filter = ('status', 'is_late', 'date')
    search_fields = ('staff__user__first_name', 'staff__user__last_name')


@admin.register(StaffLeaveRequest)
class StaffLeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('staff', 'leave_type', 'from_date', 'to_date', 'status', 'reviewed_by')
    list_filter = ('status', 'leave_type')
    search_fields = ('staff__user__first_name', 'staff__user__last_name')


@admin.register(LeavePolicy)
class LeavePolicyAdmin(admin.ModelAdmin):
    list_display = ('leave_type', 'days_per_year', 'school', 'is_carry_forward')
    list_filter = ('leave_type',)


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('staff', 'leave_type', 'year', 'total_allowed', 'used')
    list_filter = ('year', 'leave_type')
