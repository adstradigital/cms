from django.contrib import admin
from .models import Attendance, LeaveRequest

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "date", "status", "marked_by")
    list_filter = ("status", "date", "subject")
    search_fields = ("student__user__first_name", "student__user__last_name", "student__admission_number")

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("student", "from_date", "to_date", "status", "reviewed_by")
    list_filter = ("status", "from_date")
    search_fields = ("student__user__first_name", "student__user__last_name", "reason")
