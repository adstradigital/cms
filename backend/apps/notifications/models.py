from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    TARGET_CHOICES = [
        ("all", "All"),
        ("students", "Students Only"),
        ("parents", "Parents Only"),
        ("staff", "Staff Only"),
        ("class", "Specific Class"),
    ]
    TYPE_CHOICES = [
        ("circular", "Circular"),
        ("event", "Event"),
        ("exam", "Exam"),
        ("fee", "Fee"),
        ("attendance", "Attendance"),
        ("general", "General"),
    ]
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="general")
    target_audience = models.CharField(max_length=20, choices=TARGET_CHOICES, default="all")
    target_class = models.ForeignKey(
        "students.Class", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="notifications",
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="notifications_sent")
    is_published = models.BooleanField(default=False)
    publish_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
