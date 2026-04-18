from django.urls import path
from . import views

urlpatterns = [
    path("types/", views.exam_type_list_view, name="exam_type_list"),
    path("", views.exam_list_view, name="exam_list"),
    path("<int:pk>/", views.exam_detail_view, name="exam_detail"),
    path("<int:pk>/publish/", views.exam_publish_view, name="exam_publish"),
    
    path("<int:exam_pk>/schedules/", views.exam_schedule_list_view, name="exam_schedule_list"),
    path("<int:exam_pk>/calculate-stats/", views.calculate_exam_stats_view, name="calculate_exam_stats"),

    path("results/", views.exam_result_list_view, name="exam_result_list"),
    path("results/bulk/", views.exam_result_bulk_view, name="exam_result_bulk"),

    path("hall-tickets/", views.hall_ticket_list_view, name="hall_ticket_list"),

    path("report-cards/", views.report_card_list_view, name="report_card_list"),
    path("report-templates/", views.report_template_list_view, name="report_template_list"),

    path("question-bank/", views.question_bank_list_view, name="question_bank_list"),
    path("question-bank/bulk-delete/", views.question_bank_bulk_delete_view, name="question_bank_bulk_delete"),
    path("question-bank/<int:pk>/", views.question_bank_detail_view, name="question_bank_detail"),
    path("question-papers/", views.question_paper_list_view, name="question_paper_list"),
    path("question-papers/<int:pk>/", views.question_paper_detail_view, name="question_paper_detail"),
    
    path("analytics/", views.exam_analytics_view, name="exam_analytics"),
    path("schedules/", views.exam_schedule_global_list_view, name="exam_schedule_global_list"),
    path("schedules/<int:pk>/", views.exam_schedule_detail_view, name="exam_schedule_detail"),

    # Student Quiz Endpoints
    path("quizzes/", views.student_quiz_list_view, name="student_quiz_list"),
    path("quizzes/<int:pk>/", views.student_quiz_detail_view, name="student_quiz_detail"),
    path("quizzes/<int:pk>/submit/", views.student_quiz_submit_view, name="student_quiz_submit"),
]
