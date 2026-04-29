from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlumniViewSet,
    AlumniEventViewSet,
    AlumniEventRSVPViewSet,
    AlumniCommunicationLogViewSet,
    AlumniContributionViewSet,
    AlumniAchievementViewSet,
)

router = DefaultRouter()
router.register(r"alumni", AlumniViewSet, basename="alumni")
router.register(r"events", AlumniEventViewSet, basename="alumni-events")
router.register(r"event-rsvps", AlumniEventRSVPViewSet, basename="alumni-event-rsvps")
router.register(r"communications", AlumniCommunicationLogViewSet, basename="alumni-communications")
router.register(r"contributions", AlumniContributionViewSet, basename="alumni-contributions")
router.register(r"achievements", AlumniAchievementViewSet, basename="alumni-achievements")

urlpatterns = [
    path("", include(router.urls)),
]

