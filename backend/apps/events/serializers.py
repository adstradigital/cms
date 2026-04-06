from rest_framework import serializers
from .models import Event, EventSubTask, Club, ClubActivity

class EventSubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSubTask
        fields = '__all__'

class EventSerializer(serializers.ModelSerializer):
    sub_tasks = EventSubTaskSerializer(many=True, read_only=True)
    coordinators_details = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'

    def get_coordinators_details(self, obj):
        return [
            {"id": c.id, "name": c.user.get_full_name()} for c in obj.coordinators.all()
        ]

class ClubActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubActivity
        fields = '__all__'

class ClubSerializer(serializers.ModelSerializer):
    activities = ClubActivitySerializer(many=True, read_only=True)
    advisor_name = serializers.CharField(source='advisor.user.get_full_name', read_only=True)

    class Meta:
        model = Club
        fields = '__all__'
