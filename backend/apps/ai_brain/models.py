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
    rollback_payload = models.JSONField(default=dict, blank=True)  # snapshot of timetable before apply
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
        ("timetable_rolled_back", "Timetable Rolled Back"),
        ("at_risk_sweep", "At-Risk Sweep"),
        ("at_risk_resolved", "At-Risk Record Resolved"),
    ]

    draft = models.ForeignKey(AIBrainDraft, on_delete=models.CASCADE, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="ai_brain_audit_logs")
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_brain_audit_logs"
        ordering = ["-created_at"]


class AtRiskRecord(models.Model):
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="at_risk_records"
    )
    section = models.ForeignKey(
        "students.Section", on_delete=models.SET_NULL, null=True, related_name="at_risk_records"
    )
    school = models.ForeignKey(
        "accounts.School", on_delete=models.CASCADE, related_name="at_risk_records"
    )
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.SET_NULL, null=True, blank=True, related_name="at_risk_records"
    )
    flagged_on = models.DateField(auto_now_add=True)
    reasons = models.JSONField(default=list)  # ["low_attendance", "low_marks"]
    attendance_pct = models.FloatField()
    marks_pct = models.FloatField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="at_risk_resolved"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_brain_at_risk_records"
        ordering = ["-created_at"]


class AutomationTaskLog(models.Model):
    TASK_TYPE_CHOICES = [
        ("report_card_bulk", "Bulk Report Card Generation"),
        ("at_risk_sweep", "At-Risk Sweep"),
        ("attendance_check", "Attendance Incomplete Check"),
        ("consecutive_absence", "Consecutive Absence Alert"),
        ("performance_digest", "Weekly Performance Digest"),
        ("draft_cleanup", "Old Draft Cleanup"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("success", "Success"),
        ("failed", "Failed"),
    ]

    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    school = models.ForeignKey(
        "accounts.School", on_delete=models.CASCADE, null=True, blank=True, related_name="automation_task_logs"
    )
    section = models.ForeignKey(
        "students.Section", on_delete=models.SET_NULL, null=True, blank=True, related_name="automation_task_logs"
    )
    triggered_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="automation_task_logs"
    )
    celery_task_id = models.CharField(max_length=255, blank=True)
    input_payload = models.JSONField(default=dict)
    result_payload = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_brain_task_logs"
        ordering = ["-created_at"]
