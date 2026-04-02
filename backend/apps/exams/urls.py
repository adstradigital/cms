from django.urls import path
from . import views

urlpatterns = [
    # Exams
    path("exams/",                           views.exam_list_view,               name="exam-list"),
    path("exams/<int:pk>/",                  views.exam_detail_view,             name="exam-detail"),
    path("exams/<int:pk>/publish/",          views.exam_publish_view,            name="exam-publish"),
    
    # Schedules
    path("exams/<int:exam_pk>/schedules/",   views.exam_schedule_list_view,      name="exam-schedule-list"),
    
    # Results
    path("results/",                         views.exam_result_list_view,        name="exam-result-list"),
    path("results/bulk/",                    views.exam_result_bulk_view,        name="exam-result-bulk"),
    
    # Hall Tickets
    path("hall-tickets/",                    views.hall_ticket_list_view,        name="hall-ticket-list"),
    
    # Report Cards
    path("report-cards/",                    views.report_card_list_view,        name="report-card-list"),
    path("exams/<int:exam_pk>/calculate-stats/", views.calculate_exam_stats_view, name="exam-calculate-stats"),
]
