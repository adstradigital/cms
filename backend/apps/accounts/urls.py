from django.urls import path
from . import views, parent_views

urlpatterns = [
    # Auth
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("token/refresh/", views.token_refresh_view, name="token_refresh"),
    
    # Current User
    path("me/", views.me_view, name="me"),
    path("me/profile/", views.my_profile_view, name="my_profile"),
    path("change-password/", views.change_password_view, name="change_password"),
    
    # Users (Admin)
    path("users/", views.user_list_view, name="user_list"),
    path("users/<int:pk>/", views.user_detail_view, name="user_detail"),
    path("users/<int:user_pk>/profile/", views.user_profile_view, name="user_profile"),
    
    # Schools
    path("schools/", views.school_list_view, name="school_list"),
    path("schools/<int:pk>/", views.school_detail_view, name="school_detail"),
    
    # Academic Years
    path("academic-years/", views.academic_year_list_view, name="academic_year_list"),
    path("academic-years/<int:pk>/", views.academic_year_detail_view, name="academic_year_detail"),
    
    # Terms
    path("terms/", views.term_list_view, name="term_list"),
    path("terms/<int:pk>/", views.term_detail_view, name="term_detail"),
    
    # Roles
    path("roles/", views.role_list_view, name="role_list"),
    
    # Public Config
    path("school-config/", views.public_school_config_view, name="school_config"),

    # Parent Portal Specific
    path("parent/stats/", parent_views.parent_stats_view, name="parent_stats"),
    path("parent/children/", parent_views.parent_children_view, name="parent_children"),
    path("parent/child/<int:child_id>/progress/", parent_views.child_progress_view, name="child_progress"),
    path("parent/child/<int:child_id>/attendance/", parent_views.child_attendance_view, name="child_attendance"),
    path("parent/child/<int:child_id>/fees/", parent_views.child_fees_view, name="child_fees"),
    path("parent/child/<int:child_id>/homework/", parent_views.child_homework_view, name="child_homework"),
]
