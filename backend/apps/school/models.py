from django.db import models

class SchoolConfig(models.Model):
    """Global school configuration and branding."""
    name = models.CharField(max_length=255, default="Schoolastica")
    tagline = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='school/', blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Theme settings (can be extended)
    primary_color = models.CharField(max_length=7, default="#00a676")
    
    class Meta:
        verbose_name = "School Configuration"
        verbose_name_plural = "School Configuration"

    def __str__(self):
        return self.name
