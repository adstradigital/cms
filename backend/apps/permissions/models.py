from django.db import models
from django.conf import settings


class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    # e.g. "students.view", "attendance.write", "reports.view", "finance.view"
    label = models.CharField(max_length=200)
    module = models.CharField(
        max_length=60, default='other',
        help_text='Grouping category e.g. Students, Fees, Attendance'
    )
    description = models.CharField(
        max_length=300, blank=True, default='',
        help_text='Plain-English explanation shown to non-technical users'
    )

    class Meta:
        ordering = ['module', 'codename']

    def __str__(self):
        return f"{self.label} ({self.codename})"


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)       # "Admin", "Class Teacher", "Accountant"
    is_custom = models.BooleanField(default=False)  # custom roles created by admin
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")
    scope = models.CharField(
        max_length=30, default='school',
        choices=[
            ('school', 'School-wide'),
            ('class', 'Own Class Only'),
            ('subject', 'Own Subjects Only'),
            ('self', 'Self Only'),
        ],
        help_text='Default data scope for this role'
    )

    def __str__(self):
        return self.name

    class Meta:
        db_table = "roles_v2"  # Using a distinct table name to avoid conflicts with legacy roles


class PermissionChangeLog(models.Model):
    ACTION_CHOICES = [
        ('granted', 'Granted'),
        ('revoked', 'Revoked'),
    ]
    TARGET_CHOICES = [
        ('role', 'Role'),
        ('user', 'User'),
    ]

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='permission_changes_made'
    )
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES)
    target_role = models.ForeignKey(
        Role, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_logs'
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='permission_changes_received'
    )
    permission = models.ForeignKey(
        Permission, on_delete=models.SET_NULL, null=True,
        related_name='change_logs'
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "permission_change_log"
        ordering = ['-timestamp']

    def __str__(self):
        target = self.target_role or self.target_user
        return f"{self.action} {self.permission} on {target} by {self.changed_by}"
