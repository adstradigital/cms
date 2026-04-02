from rest_framework import serializers
from .models import HostelBlock, HostelRoom, HostelAllotment


class HostelBlockSerializer(serializers.ModelSerializer):
    warden_name = serializers.CharField(source="warden.get_full_name", read_only=True)

    class Meta:
        model = HostelBlock
        fields = "__all__"


class HostelRoomSerializer(serializers.ModelSerializer):
    block_name = serializers.CharField(source="block.name", read_only=True)
    available_beds = serializers.SerializerMethodField()

    class Meta:
        model = HostelRoom
        fields = "__all__"

    def get_available_beds(self, obj):
        return obj.capacity - obj.occupied


class HostelAllotmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    room_info = serializers.SerializerMethodField()

    class Meta:
        model = HostelAllotment
        fields = "__all__"

    def get_room_info(self, obj):
        return f"{obj.room.block.name} — Room {obj.room.room_number}"
