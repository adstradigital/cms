from rest_framework import serializers
from .models import Election, Candidate, Vote


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ["id", "name", "image_data"]


class ElectionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    class_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = ["id", "title", "role", "status", "section", "class_name", "section_name", "candidates", "created_at", "ended_at"]

    def get_class_name(self, obj):
        try:
            return obj.section.school_class.name
        except Exception:
            return None

    def get_section_name(self, obj):
        return getattr(obj.section, "name", None)


class ElectionCreateSerializer(serializers.Serializer):
    section = serializers.IntegerField()
    title = serializers.CharField(max_length=255)
    role = serializers.CharField(max_length=120, required=False, allow_blank=True)
    candidates = serializers.ListField(child=serializers.DictField(), min_length=2)


class VoteSerializer(serializers.Serializer):
    election = serializers.IntegerField()
    candidate = serializers.IntegerField()
    roll_number = serializers.CharField(max_length=32)

