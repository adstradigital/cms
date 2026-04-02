from django.urls import path
from . import views

urlpatterns = [
    path("", views.notification_list_view, name="notification-list"),
    path("<int:pk>/", views.notification_detail_view, name="notification-detail"),
    path("<int:pk>/publish/", views.notification_publish_view, name="notification-publish"),
]
