from django.urls import path
from . import views

urlpatterns = [
    # Subjects
    path("subjects/", views.subject_list_view, name="subject-list"),
    path("subjects/<int:pk>/", views.subject_detail_view, name="subject-detail"),

    # Timetable
    path("timetables/", views.timetable_list_view, name="timetable-list"),
    path("timetables/<int:pk>/", views.timetable_detail_view, name="timetable-detail"),
    path("timetables/<int:pk>/publish/", views.timetable_publish_view, name="timetable-publish"),

    # Periods
    path("timetables/<int:timetable_pk>/periods/", views.period_create_view, name="period-create"),
    path("periods/<int:pk>/", views.period_detail_view, name="period-detail"),

    # Homework
    path("homework/", views.homework_list_view, name="homework-list"),
    path("homework/<int:pk>/", views.homework_detail_view, name="homework-detail"),
    path("homework/<int:homework_pk>/submissions/", views.homework_submission_list_view, name="homework-submission-list"),
    path("submissions/<int:pk>/grade/", views.homework_submission_grade_view, name="homework-submission-grade"),

    # Substitute
    path("substitutes/", views.substitute_log_list_view, name="substitute-log-list"),
    path("substitutes/available/", views.available_substitutes_view, name="available-substitutes"),
]
