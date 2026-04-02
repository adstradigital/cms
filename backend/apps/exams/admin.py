from django.contrib import admin
from .models import Exam, ExamSchedule, ExamResult, HallTicket, ReportCard

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "school_class", "exam_type", "is_published")
    list_filter = ("academic_year", "school_class", "exam_type", "is_published")
    search_fields = ("name",)

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ("exam", "subject", "date", "start_time", "max_marks")
    list_filter = ("exam", "subject", "date")

@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ("student", "exam_schedule", "marks_obtained", "grade", "entered_by")
    list_filter = ("exam_schedule__exam", "grade")
    search_fields = ("student__user__first_name", "student__user__last_name", "student__admission_number")

@admin.register(HallTicket)
class HallTicketAdmin(admin.ModelAdmin):
    list_display = ("student", "exam", "seat_number", "is_eligible")
    list_filter = ("exam", "is_eligible")

@admin.register(ReportCard)
class ReportCardAdmin(admin.ModelAdmin):
    list_display = ("student", "exam", "total_marks", "percentage", "grade")
    list_filter = ("exam", "grade")
