from rest_framework import serializers

from .models import (
    Alumni,
    AlumniEvent,
    AlumniEventRSVP,
    AlumniCommunicationLog,
    AlumniContribution,
    AlumniAchievement,
)


class AlumniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumni
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by", "verified_by", "verified_at"]
        extra_kwargs = {"school": {"required": False}}


class AlumniEventSerializer(serializers.ModelSerializer):
    rsvp_counts = serializers.SerializerMethodField()

    class Meta:
        model = AlumniEvent
        fields = "__all__"
        read_only_fields = ["created_at", "created_by"]
        extra_kwargs = {"school": {"required": False}}

    def get_rsvp_counts(self, obj):
        # Keep it small: frontend can render these numbers directly
        from django.db.models import Count

        counts = obj.rsvps.values("status").annotate(count=Count("id"))
        return {row["status"]: row["count"] for row in counts}


class AlumniEventRSVPSerializer(serializers.ModelSerializer):
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)

    class Meta:
        model = AlumniEventRSVP
        fields = "__all__"
        read_only_fields = ["responded_at"]


class AlumniCommunicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlumniCommunicationLog
        fields = "__all__"
        read_only_fields = ["recipient_count", "created_at", "sent_at", "created_by"]
        extra_kwargs = {"school": {"required": False}}


class AlumniContributionSerializer(serializers.ModelSerializer):
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)

    class Meta:
        model = AlumniContribution
        fields = "__all__"
        read_only_fields = ["created_at", "created_by"]
        extra_kwargs = {"school": {"required": False}}


class AlumniAchievementSerializer(serializers.ModelSerializer):
    alumni_name = serializers.CharField(source="alumni.name", read_only=True)

    class Meta:
        model = AlumniAchievement
        fields = "__all__"
        read_only_fields = ["created_at", "created_by"]
        extra_kwargs = {"school": {"required": False}}
