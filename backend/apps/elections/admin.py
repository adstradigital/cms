from django.contrib import admin
from .models import Election, Candidate, Vote


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "section", "role", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("title",)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "election")
    search_fields = ("name",)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("id", "election", "candidate", "roll_number", "voted_at")
    search_fields = ("roll_number",)

