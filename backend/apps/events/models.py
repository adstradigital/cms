from django.db import models
from apps.staff.models import Staff
from apps.students.models import Section

class Event(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    coordinators = models.ManyToManyField(Staff, related_name="coordinated_events", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "events"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.title} ({self.date})"


class EventSubTask(models.Model):
    """Specific delegated tasks within an event managed by student groups/sections."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="sub_tasks")
    title = models.CharField(max_length=255)
    assigned_sections = models.ManyToManyField(Section, related_name="assigned_event_tasks", blank=True)
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('done', 'Done')], default='pending')
    
    class Meta:
        db_table = "event_sub_tasks"

    def __str__(self):
        return f"{self.title} - {self.event.title}"


class Club(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    advisor = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name="advised_clubs")
    meeting_schedule = models.CharField(max_length=255, blank=True) # e.g., "Every Friday 3:00 PM"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "clubs"

    def __str__(self):
        return self.name


class ClubActivity(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="activities")
    title = models.CharField(max_length=255)
    date = models.DateField()
    participation_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "club_activities"
        ordering = ["-date"]

    def __str__(self):
        return f"{self.club.name} - {self.title}"
