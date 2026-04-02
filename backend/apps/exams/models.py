from django.db import models
from apps.accounts.models import AcademicYear
from apps.students.models import Class, Section, Student
from apps.academics.models import Subject


class Exam(models.Model):
    EXAM_TYPE_CHOICES = [
        ("unit_test", "Unit Test"),
        ("mid_term", "Mid Term"),
        ("final", "Final Exam"),
        ("quarterly", "Quarterly"),
        ("half_yearly", "Half Yearly"),
        ("annual", "Annual"),
    ]
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="exams")
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="exams")
    name = models.CharField(max_length=100)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.school_class.name}"

    class Meta:
        db_table = "exams"


class ExamSchedule(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="schedules")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="exam_schedules")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_marks = models.PositiveSmallIntegerField(default=100)
    pass_marks = models.PositiveSmallIntegerField(default=35)
    venue = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.exam.name} — {self.subject.name} on {self.date}"

    class Meta:
        db_table = "exam_schedules"
        unique_together = ("exam", "subject")


class HallTicket(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="hall_tickets")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="hall_tickets")
    seat_number = models.CharField(max_length=20, blank=True)
    is_eligible = models.BooleanField(default=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Hall Ticket — {self.student} — {self.exam.name}"

    class Meta:
        db_table = "hall_tickets"
        unique_together = ("student", "exam")


class ExamResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="exam_results")
    exam_schedule = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE, related_name="results")
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    is_absent = models.BooleanField(default=False)
    remarks = models.CharField(max_length=255, blank=True)
    entered_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="results_entered")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} — {self.exam_schedule.subject.name} — {self.marks_obtained}"

    class Meta:
        db_table = "exam_results"
        unique_together = ("student", "exam_schedule")


class ReportCard(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="report_cards")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="report_cards")
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    rank = models.PositiveSmallIntegerField(null=True, blank=True)
    teacher_remarks = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    pdf_file = models.FileField(upload_to="report_cards/", null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report — {self.student} — {self.exam.name}"

    class Meta:
        db_table = "report_cards"
        unique_together = ("student", "exam")