from django.urls import path
from . import views

urlpatterns = [
    path("routes/", views.transport_route_list_view, name="transport-route-list"),
    path("routes/<int:pk>/", views.transport_route_detail_view, name="transport-route-detail"),
    path("routes/<int:route_pk>/stops/", views.route_stop_create_view, name="route-stop-create"),
    path("students/", views.student_transport_list_view, name="student-transport-list"),
]
