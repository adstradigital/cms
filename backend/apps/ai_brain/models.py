from django.db import models


class AIBrainDraft(models.Model):
    DRAFT_TYPE_CHOICES = [
        ("timetable", "Timetable"),
        ("report_card", "Report Card"),
        ("risk", "Risk Analysis"),
    ]
    STATUS_CHOICES = [
        ("preview", "Preview"),
        ("applied", "Applied"),
        ("discarded", "Discarded"),
    ]

    draft_type = models.CharField(max_length=20, choices=DRAFT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="preview")
    school = models.ForeignKey("accounts.School", on_delete=models.CASCADE, related_name="ai_brain_drafts")
    section = models.ForeignKey(
        "students.Section",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_brain_drafts",
    )
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_brain_drafts",
    )
    requested_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="ai_brain_requested_drafts",
    )
    input_payload = models.JSONField(default=dict, blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    manual_override_payload = models.JSONField(default=dict, blank=True)
    is_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_brain_drafts"
        ordering = ["-created_at"]


class AIBrainAuditLog(models.Model):
    ACTION_CHOICES = [
        ("preview_generated", "Preview Generated"),
        ("preview_applied", "Preview Applied"),
        ("manual_override", "Manual Override"),
    ]

    draft = models.ForeignKey(AIBrainDraft, on_delete=models.CASCADE, related_name="audit_logs")
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="ai_brain_audit_logs")
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_brain_audit_logs"
        ordering = ["-created_at"]
