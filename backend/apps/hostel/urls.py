from django.urls import path
from . import views

urlpatterns = [
    path("blocks/", views.hostel_block_list_view, name="hostel-block-list"),
    path("rooms/", views.hostel_room_list_view, name="hostel-room-list"),
    path("allotments/", views.hostel_allotment_list_view, name="hostel-allotment-list"),
    path("allotments/<int:pk>/vacate/", views.hostel_vacate_view, name="hostel-vacate"),
]
