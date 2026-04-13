from django.urls import path
from . import views
from .views_pdf import TimetablePDFExportView

urlpatterns = [
    path("", views.timetable_list_view, name="timetable-list-v2"),
    path("settings/", views.timetable_settings_view, name="timetable-settings"),
    path("absence-status/", views.absence_status_view, name="timetable-absence-status"),
    path("publish/", views.timetable_publish_view, name="timetable-publish-bulk"),
    path("generate/", views.timetable_generate_view, name="timetable-generate"),
    path("draft/", views.timetable_draft_view, name="timetable-draft"),
    path("<int:pk>/", views.timetable_detail_view, name="timetable-detail-v2"),
    path("<int:pk>/publish/", views.timetable_publish_view, name="timetable-publish-single"),
    path("export-pdf/", TimetablePDFExportView.as_view(), name="timetable-export-pdf"),
]
