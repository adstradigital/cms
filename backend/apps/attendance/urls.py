from django.urls import path
from . import views

urlpatterns = [
    path("attendance/",                              views.attendance_list_view,         name="attendance-list"),
    path("attendance/bulk-mark/",                    views.attendance_bulk_mark_view,    name="attendance-bulk-mark"),
    path("attendance/summary/<int:student_id>/",     views.attendance_summary_view,      name="attendance-summary"),
    path("leave-requests/",                          views.leave_request_list_view,      name="leave-request-list"),
    path("leave-requests/<int:pk>/review/",          views.leave_request_review_view,    name="leave-request-review"),
    path("admin/overview/",                          views.admin_attendance_overview_view, name="admin-attendance-overview"),
    path("admin/student/<int:student_id>/",          views.admin_student_attendance_detail_view, name="admin-student-attendance-detail"),
    path("admin/warnings/",                          views.admin_attendance_warning_view, name="admin-attendance-warning"),
]
