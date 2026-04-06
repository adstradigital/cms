from django.urls import path
from . import views

urlpatterns = [
    path("roles/", views.role_list_view, name="perm-role-list"),
    path("roles/<int:pk>/", views.role_detail_view, name="perm-role-detail"),
    path("permissions/", views.permission_list_view, name="perm-permission-list"),
    path("users/<int:user_id>/permissions/", views.user_permissions_view, name="perm-user-permissions"),
    path("users/<int:user_id>/effective/", views.user_effective_permissions_view, name="perm-user-effective"),
    path("changelog/", views.permission_changelog_view, name="perm-changelog"),
    path("staff-users/", views.staff_users_list_view, name="perm-staff-users"),
]
