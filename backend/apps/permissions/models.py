from django.db import models

class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    # e.g. "students.view", "attendance.write", "reports.view", "finance.view"
    label = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.label} ({self.codename})"

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)       # "Admin", "Class Teacher", "Accountant"
    is_custom = models.BooleanField(default=False) # custom roles created by admin
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")

    def __str__(self):
        return self.name

    class Meta:
        db_table = "roles_v2" # Using a distinct table name to avoid conflicts with legacy roles
