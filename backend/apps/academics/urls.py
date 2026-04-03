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

    # Assignments
    path("assignments/", views.assignment_list_view, name="assignment-list"),
    path("assignments/<int:pk>/", views.assignment_detail_view, name="assignment-detail"),

    # Materials
    path("materials/", views.material_list_view, name="material-list"),
    path("materials/<int:pk>/", views.material_detail_view, name="material-detail"),

    # Syllabus & Lesson Planning
    path("syllabus/units/", views.syllabus_unit_list_view, name="syllabus-unit-list"),
    path("syllabus/units/<int:pk>/", views.syllabus_unit_detail_view, name="syllabus-unit-detail"),
    path("syllabus/chapters/", views.syllabus_chapter_list_view, name="syllabus-chapter-list"),
    path("syllabus/chapters/<int:pk>/", views.syllabus_chapter_detail_view, name="syllabus-chapter-detail"),
    path("syllabus/topics/", views.syllabus_topic_list_view, name="syllabus-topic-list"),
    path("syllabus/topics/<int:pk>/", views.syllabus_topic_detail_view, name="syllabus-topic-detail"),
    path("allocations/", views.subject_allocation_list_view, name="subject-allocation-list"),
    path("allocations/<int:pk>/", views.subject_allocation_detail_view, name="subject-allocation-detail"),
    path("lesson-plans/", views.lesson_plan_list_view, name="lesson-plan-list"),
    path("lesson-plans/<int:pk>/", views.lesson_plan_detail_view, name="lesson-plan-detail"),

    # Substitute
    path("substitutes/", views.substitute_log_list_view, name="substitute-log-list"),
    path("substitutes/available/", views.available_substitutes_view, name="available-substitutes"),
]
