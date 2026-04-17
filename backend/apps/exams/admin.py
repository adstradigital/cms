from django.contrib import admin
from .models import (
    Exam, ExamSchedule, ExamResult, HallTicket, ReportCard,
    GradingScale, ExamType, ReportTemplate, QuestionBank,
    QuestionPaper, OnlineTestAttempt, StudentAnswer
)

@admin.register(GradingScale)
class GradingScaleAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "created_at")

@admin.register(ExamType)
class ExamTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "weightage_percentage", "passing_percentage", "is_online")

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ("name", "academic_year", "school_class", "exam_type", "is_online", "is_published")
    list_filter = ("academic_year", "school_class", "exam_type", "is_online", "is_published")
    search_fields = ("name",)

@admin.register(ExamSchedule)
class ExamScheduleAdmin(admin.ModelAdmin):
    list_display = ("exam", "subject", "date", "start_time", "max_theory_marks", "max_internal_marks")
    list_filter = ("exam", "subject", "date")

@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ("student", "exam_schedule", "theory_marks", "internal_marks", "marks_obtained", "grade", "entered_by")
    list_filter = ("exam_schedule__exam", "grade")
    search_fields = ("student__user__first_name", "student__user__last_name", "student__admission_number")

@admin.register(HallTicket)
class HallTicketAdmin(admin.ModelAdmin):
    list_display = ("student", "exam", "seat_number", "is_eligible")
    list_filter = ("exam", "is_eligible")

@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "updated_at")

@admin.register(ReportCard)
class ReportCardAdmin(admin.ModelAdmin):
    list_display = ("student", "exam", "total_marks", "percentage", "grade")
    list_filter = ("exam", "grade")

@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display = ("text", "subject", "question_type", "marks", "bloom_level")
    list_filter = ("subject", "question_type", "bloom_level")

@admin.register(QuestionPaper)
class QuestionPaperAdmin(admin.ModelAdmin):
    list_display = ("name", "exam_schedule", "subject", "total_marks", "duration_minutes")

@admin.register(OnlineTestAttempt)
class OnlineTestAttemptAdmin(admin.ModelAdmin):
    list_display = ("student", "question_paper", "status", "score", "started_at")
    list_filter = ("status", "question_paper")

@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ("attempt", "question", "is_correct", "marks_awarded")
