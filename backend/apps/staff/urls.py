from django.urls import path
from . import views

urlpatterns = [
    path('', views.staff_list_view, name='staff-list'),
    path('teachers/', views.teacher_list_view, name='teacher-list'),
    path('<int:pk>/', views.staff_detail_view, name='staff-detail'),
    path('<int:pk>/reset-credentials/', views.staff_reset_credentials_view, name='staff-reset-credentials'),
]
