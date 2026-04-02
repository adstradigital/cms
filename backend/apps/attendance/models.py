from django.db import models
from apps.students.models import Student, Section
from apps.academics.models import Subject, Period
from apps.accounts.models import User, AcademicYear


class Attendance(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("late", "Late"),
        ("leave", "Leave"),
        ("holiday", "Holiday"),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_records")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_records")
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="present")
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="attendance_marked")
    remarks = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} — {self.date} — {self.status}"

    class Meta:
        db_table = "attendance"
        unique_together = ("student", "subject", "date")


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="leave_requests")
    from_date = models.DateField()
    to_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="leave_reviews")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} leave {self.from_date} to {self.to_date}"

    class Meta:
        db_table = "leave_requests"


class AttendanceWarning(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance_warnings")
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="attendance_warnings_sent")
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    threshold = models.DecimalField(max_digits=5, decimal_places=2, default=75.00)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Warning to {self.student} ({self.attendance_percentage}%)"

    class Meta:
        db_table = "attendance_warnings"
        ordering = ["-created_at"]
