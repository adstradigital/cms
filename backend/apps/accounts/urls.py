from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("token/refresh/", views.token_refresh_view, name="token_refresh"),
    
    # Current User
    path("me/", views.me_view, name="me"),
    path("change-password/", views.change_password_view, name="change_password"),
    
    # Users (Admin)
    path("users/", views.user_list_view, name="user_list"),
    path("users/<int:pk>/", views.user_detail_view, name="user_detail"),
    path("users/<int:user_pk>/profile/", views.user_profile_view, name="user_profile"),
    
    # Schools
    path("schools/", views.school_list_view, name="school_list"),
    path("schools/<int:pk>/", views.school_detail_view, name="school_detail"),
    path("onboard-school/", views.school_onboarding_view, name="onboard_school"),
    
    # Academic Years
    path("academic-years/", views.academic_year_list_view, name="academic_year_list"),
    path("academic-years/<int:pk>/", views.academic_year_detail_view, name="academic_year_detail"),
    
    # Roles
    path("roles/", views.role_list_view, name="role_list"),
]
