from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0011_remove_user_assigned_class"),
        ("exams", "0001_initial"),
        ("students", "0004_student_previous_school"),
    ]

    operations = [
        migrations.CreateModel(
            name="AIBrainDraft",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("draft_type", models.CharField(choices=[("timetable", "Timetable"), ("report_card", "Report Card"), ("risk", "Risk Analysis")], max_length=20)),
                ("status", models.CharField(choices=[("preview", "Preview"), ("applied", "Applied"), ("discarded", "Discarded")], default="preview", max_length=20)),
                ("input_payload", models.JSONField(blank=True, default=dict)),
                ("output_payload", models.JSONField(blank=True, default=dict)),
                ("manual_override_payload", models.JSONField(blank=True, default=dict)),
                ("is_applied", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("exam", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ai_brain_drafts", to="exams.exam")),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ai_brain_requested_drafts", to=settings.AUTH_USER_MODEL)),
                ("school", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ai_brain_drafts", to="accounts.school")),
                ("section", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ai_brain_drafts", to="students.section")),
            ],
            options={
                "db_table": "ai_brain_drafts",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="AIBrainAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(choices=[("preview_generated", "Preview Generated"), ("preview_applied", "Preview Applied"), ("manual_override", "Manual Override")], max_length=30)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ai_brain_audit_logs", to=settings.AUTH_USER_MODEL)),
                ("draft", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="audit_logs", to="ai_brain.aibraindraft")),
            ],
            options={
                "db_table": "ai_brain_audit_logs",
                "ordering": ["-created_at"],
            },
        ),
    ]
