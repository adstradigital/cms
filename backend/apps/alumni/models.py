from django.db import models
from django.utils import timezone

from apps.accounts.models import School, User


class Alumni(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="alumni")

    name = models.CharField(max_length=255)
    graduation_year = models.PositiveSmallIntegerField()
    class_stream = models.CharField(max_length=100, blank=True)

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)

    job_role = models.CharField(max_length=150, blank=True)
    organization = models.CharField(max_length=150, blank=True)
    industry = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=150, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_alumni"
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_alumni"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "alumni"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["school", "graduation_year"]),
            models.Index(fields=["school", "status"]),
            models.Index(fields=["school", "is_verified"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.graduation_year})"

    def mark_verified(self, user=None):
        self.is_verified = True
        self.verified_at = timezone.now()
        if user is not None:
            self.verified_by = user


class AlumniEvent(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="alumni_events")

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_alumni_events"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "alumni_events"
        ordering = ["-start_at"]
        indexes = [
            models.Index(fields=["school", "start_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_at.date()})"


class AlumniEventRSVP(models.Model):
    STATUS_CHOICES = [
        ("going", "Going"),
        ("maybe", "Maybe"),
        ("not_going", "Not Going"),
    ]

    event = models.ForeignKey(AlumniEvent, on_delete=models.CASCADE, related_name="rsvps")
    alumni = models.ForeignKey(Alumni, on_delete=models.CASCADE, related_name="event_rsvps")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="going")
    note = models.CharField(max_length=255, blank=True)
    responded_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "alumni_event_rsvps"
        unique_together = ("event", "alumni")
        indexes = [
            models.Index(fields=["event", "status"]),
        ]

    def __str__(self):
        return f"{self.alumni.name} -> {self.event.title}: {self.status}"


class AlumniCommunicationLog(models.Model):
    CHANNEL_CHOICES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("in_app", "In App"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="alumni_communications")

    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="email")
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()

    segment_filters = models.JSONField(default=dict, blank=True)
    recipient_count = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_alumni_communications"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "alumni_communication_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["school", "channel"]),
            models.Index(fields=["school", "status"]),
        ]

    def __str__(self):
        return f"{self.get_channel_display()} - {self.subject or '(no subject)'}"


class AlumniContribution(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="alumni_contributions")
    alumni = models.ForeignKey(Alumni, on_delete=models.CASCADE, related_name="contributions")

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    contributed_on = models.DateField(default=timezone.now)
    note = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_alumni_contributions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "alumni_contributions"
        ordering = ["-contributed_on", "-created_at"]
        indexes = [
            models.Index(fields=["school", "contributed_on"]),
        ]

    def __str__(self):
        return f"{self.alumni.name} - {self.amount} {self.currency}"


class AlumniAchievement(models.Model):
    VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="alumni_achievements")
    alumni = models.ForeignKey(Alumni, on_delete=models.CASCADE, related_name="achievements")

    title = models.CharField(max_length=255)
    story = models.TextField(blank=True)
    image = models.ImageField(upload_to="alumni/achievements/", null=True, blank=True)

    is_featured = models.BooleanField(default=False)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="private")

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_alumni_achievements"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "alumni_achievements"
        ordering = ["-is_featured", "-created_at"]
        indexes = [
            models.Index(fields=["school", "is_featured"]),
            models.Index(fields=["school", "visibility"]),
        ]

    def __str__(self):
        return f"{self.alumni.name} - {self.title}"

