from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventSubTaskViewSet, ClubViewSet, ClubActivityViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='events')
router.register(r'subtasks', EventSubTaskViewSet, basename='event_subtasks')
router.register(r'clubs', ClubViewSet, basename='clubs')
router.register(r'club-activities', ClubActivityViewSet, basename='club_activities')

urlpatterns = [
    path('', include(router.urls)),
]
