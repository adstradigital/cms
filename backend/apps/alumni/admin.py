from django.contrib import admin

from .models import (
    Alumni,
    AlumniEvent,
    AlumniEventRSVP,
    AlumniCommunicationLog,
    AlumniContribution,
    AlumniAchievement,
)


@admin.register(Alumni)
class AlumniAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "graduation_year", "status", "is_verified", "school")
    list_filter = ("status", "is_verified", "graduation_year", "school")
    search_fields = ("name", "email", "phone", "organization", "job_role", "location")


@admin.register(AlumniEvent)
class AlumniEventAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "start_at", "venue", "school")
    list_filter = ("school",)
    search_fields = ("title", "venue")


@admin.register(AlumniEventRSVP)
class AlumniEventRSVPAdmin(admin.ModelAdmin):
    list_display = ("id", "event", "alumni", "status", "responded_at")
    list_filter = ("status",)


@admin.register(AlumniCommunicationLog)
class AlumniCommunicationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "channel", "status", "recipient_count", "created_at", "school")
    list_filter = ("channel", "status", "school")


@admin.register(AlumniContribution)
class AlumniContributionAdmin(admin.ModelAdmin):
    list_display = ("id", "alumni", "amount", "currency", "contributed_on", "school")
    list_filter = ("currency", "school")


@admin.register(AlumniAchievement)
class AlumniAchievementAdmin(admin.ModelAdmin):
    list_display = ("id", "alumni", "title", "is_featured", "visibility", "school")
    list_filter = ("is_featured", "visibility", "school")

