from django.urls import path

from . import views


urlpatterns = [

    path("run/", views.run_ai_task_view, name="ai-brain-run"),

    # ── Inventory ──────────────────────────────────────────────────────────────

    path("inventory/", views.data_inventory_view, name="ai-brain-inventory"),

    # ── Timetable ──────────────────────────────────────────────────────────────
    path("timetable/validate/", views.validate_timetable_view, name="ai-brain-timetable-validate"),
    path("timetable/generate/", views.generate_timetable_view, name="ai-brain-timetable-generate"),
    path("timetable/drafts/<int:draft_id>/apply/", views.apply_timetable_draft_view, name="ai-brain-timetable-draft-apply"),
    path("timetable/drafts/<int:draft_id>/rollback/", views.rollback_timetable_draft_view, name="ai-brain-timetable-draft-rollback"),

    # ── Report Cards ───────────────────────────────────────────────────────────
    path("report-card/generate/", views.generate_report_card_view, name="ai-brain-report-card-generate"),
    path("report-card/generate-class/", views.generate_report_cards_for_section_view, name="ai-brain-report-card-generate-class"),

    # ── At-Risk ────────────────────────────────────────────────────────────────
    path("students/at-risk/", views.detect_at_risk_students_view, name="ai-brain-students-at-risk"),
    path("students/at-risk/sweep/", views.school_at_risk_sweep_view, name="ai-brain-at-risk-sweep"),
    path("at-risk/records/", views.at_risk_records_view, name="ai-brain-at-risk-records"),
    path("at-risk/records/<int:record_id>/resolve/", views.resolve_at_risk_view, name="ai-brain-at-risk-resolve"),

    # ── Audit & Tasks ──────────────────────────────────────────────────────────
    path("audit-log/", views.audit_log_view, name="ai-brain-audit-log"),
    path("tasks/", views.task_logs_view, name="ai-brain-task-logs"),
    path("tasks/<int:task_id>/status/", views.task_status_view, name="ai-brain-task-status"),
    path("tasks/trigger/", views.trigger_task_view, name="ai-brain-task-trigger"),
]
