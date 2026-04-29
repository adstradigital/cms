from django.urls import path
from . import views

urlpatterns = [
    path('', views.staff_list_view, name='staff-list'),
    path('teachers/', views.teacher_list_view, name='teacher-list'),
    path('<int:pk>/', views.staff_detail_view, name='staff-detail'),
    path('<int:pk>/reset-credentials/', views.staff_reset_credentials_view, name='staff-reset-credentials'),
    
    path('attendance/', views.staff_attendance_view, name='staff-attendance'),
    path('hr/dashboard/', views.staff_hr_dashboard_view, name='staff-hr-dashboard'),
    path('hr/attendance/', views.staff_attendance_filtered_view, name='staff-hr-attendance-filtered'),
    path('hr/attendance/bulk/', views.staff_bulk_attendance_view, name='staff-hr-attendance-bulk'),
    path('hr/attendance/<int:pk>/', views.staff_attendance_update_view, name='staff-hr-attendance-update'),
    path('hr/leave-balance/', views.staff_leave_balance_view, name='staff-hr-leave-balance'),
    path('hr/monthly-report/', views.staff_monthly_report_view, name='staff-hr-monthly-report'),
    path('hr/monthly-report/export/', views.staff_monthly_report_export_view, name='staff-hr-monthly-report-export'),
    path('leaves/', views.staff_leave_view, name='staff-leaves'),
    path('leaves/<int:pk>/', views.staff_leave_detail_view, name='staff-leave-detail'),
    path('tasks/', views.staff_task_view, name='staff-tasks'),
    path('tasks/<int:pk>/', views.staff_task_detail_view, name='staff-task-detail'),
    path('leaderboard/', views.teacher_leaderboard_view, name='teacher-leaderboard'),
]
