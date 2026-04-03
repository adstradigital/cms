from django.db import models
from apps.accounts.models import User, School

class Staff(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    employee_id = models.CharField(max_length=50, unique=True)
    designation = models.CharField(max_length=100) # e.g. "Senior Teacher", "Accountant"
    joining_date = models.DateField()
    qualification = models.CharField(max_length=255, blank=True)
    experience_years = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    is_teaching_staff = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"

    class Meta:
        db_table = "staff"
        verbose_name_plural = "Staff"


class TeacherDetail(models.Model):
    staff = models.OneToOneField(Staff, on_delete=models.CASCADE, related_name="teacher_detail")
    specialization = models.CharField(max_length=255, blank=True) # e.g. "Pure Mathematics"
    bio = models.TextField(blank=True)
    
    # Academic context like assigned subjects and classes is already handled 
    # via academics.SubjectAllocation and students.Section.class_teacher
    
    def __str__(self):
        return f"Teacher Info - {self.staff.user.get_full_name()}"

    class Meta:
        db_table = "teacher_details"
