from django.urls import path
from . import views

urlpatterns = [
    path("", views.timetable_list_view, name="timetable-list-v2"),
    path("settings/", views.timetable_settings_view, name="timetable-settings"),
    path("absence-status/", views.absence_status_view, name="timetable-absence-status"),
    path("<int:pk>/", views.timetable_detail_view, name="timetable-detail-v2"),
]
