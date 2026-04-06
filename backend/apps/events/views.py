from rest_framework import viewsets, permissions
from .models import Event, EventSubTask, Club, ClubActivity
from .serializers import EventSerializer, EventSubTaskSerializer, ClubSerializer, ClubActivitySerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

class EventSubTaskViewSet(viewsets.ModelViewSet):
    queryset = EventSubTask.objects.all()
    serializer_class = EventSubTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    permission_classes = [permissions.IsAuthenticated]

class ClubActivityViewSet(viewsets.ModelViewSet):
    queryset = ClubActivity.objects.all()
    serializer_class = ClubActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
