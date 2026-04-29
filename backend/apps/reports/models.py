from django.db import models
from apps.accounts.models import User


class SavedReport(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=50)
    fields = models.JSONField(default=list)
    filters = models.JSONField(default=list)
    filter_logic = models.CharField(max_length=10, default='AND')
    group_by = models.CharField(max_length=100, blank=True)
    then_by = models.CharField(max_length=100, blank=True)
    sort_field = models.CharField(max_length=100, blank=True)
    sort_direction = models.CharField(max_length=10, default='asc')
    output_type = models.CharField(max_length=20, default='table')
    chart_type = models.CharField(max_length=20, default='bar')
    formulas = models.JSONField(default=list)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='saved_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
