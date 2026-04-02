"""
Base model with common fields for all project models.
"""
from django.db import models


class BaseModel(models.Model):
    """Abstract base model providing timestamp fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
