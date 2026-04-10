from django.db import models
from apps.accounts.models import User


class Election(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("ongoing", "Ongoing"),
        ("ended", "Ended"),
    ]
    section = models.ForeignKey("students.Section", on_delete=models.CASCADE, related_name="elections", null=True, blank=True)
    title = models.CharField(max_length=255)
    role = models.CharField(max_length=120, default="Class Leader")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="elections_created")
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "elections"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.section})"


class Candidate(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name="candidates")
    name = models.CharField(max_length=255)
    image_data = models.TextField(blank=True, default="")  # data URI or URL
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "election_candidates"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({self.election_id})"


class Vote(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name="votes")
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="votes")
    roll_number = models.CharField(max_length=32)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "election_votes"
        constraints = [
            models.UniqueConstraint(fields=["election", "roll_number"], name="uniq_vote_per_roll_per_election")
        ]

    def __str__(self):
        return f"{self.election_id}:{self.roll_number}->{self.candidate_id}"

