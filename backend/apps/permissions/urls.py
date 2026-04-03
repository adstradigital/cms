from django.urls import path
from . import views

urlpatterns = [
    path("roles/", views.role_list_view, name="perm-role-list"),
    path("roles/<int:pk>/", views.role_detail_view, name="perm-role-detail"),
    path("permissions/", views.permission_list_view, name="perm-permission-list"),
]

