from django.urls import path

from . import views


urlpatterns = [
    path("run/", views.run_ai_task_view, name="ai-brain-run"),
    path("inventory/", views.data_inventory_view, name="ai-brain-inventory"),
    path("timetable/validate/", views.validate_timetable_view, name="ai-brain-timetable-validate"),
    path("timetable/generate/", views.generate_timetable_view, name="ai-brain-timetable-generate"),
    path("timetable/drafts/<int:draft_id>/apply/", views.apply_timetable_draft_view, name="ai-brain-timetable-draft-apply"),
    path("report-card/generate/", views.generate_report_card_view, name="ai-brain-report-card-generate"),
    path("report-card/generate-class/", views.generate_report_cards_for_section_view, name="ai-brain-report-card-generate-class"),
    path("students/at-risk/", views.detect_at_risk_students_view, name="ai-brain-students-at-risk"),
]
