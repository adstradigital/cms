from django.contrib.auth.models import AbstractUser
from django.db import models


class School(models.Model):
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="school/logos/", null=True, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "schools"


class AcademicYear(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="academic_years")
    name = models.CharField(max_length=50)          # e.g. "2024-25"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.school.name} — {self.name}"

    class Meta:
        db_table = "academic_years"
        unique_together = ("school", "name")


class Role(models.Model):
    """DEPRECATED: Use apps.permissions.Role instead."""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"OLD ROLE: {self.name}"

    class Meta:
        db_table = "roles"


class User(AbstractUser):
    PORTAL_ADMIN   = 'admin'
    PORTAL_STUDENT = 'student'
    PORTAL_PARENT  = 'parent'
    PORTAL_CREATOR = 'creator'

    PORTAL_CHOICES = [
        (PORTAL_ADMIN,   'Admin Portal'),
        (PORTAL_STUDENT, 'Student Portal'),
        (PORTAL_PARENT,  'Parent Portal'),
        (PORTAL_CREATOR, 'Creator Portal'),
    ]

    portal      = models.CharField(max_length=20, choices=PORTAL_CHOICES, default=PORTAL_ADMIN)
    school      = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    role        = models.ForeignKey('permissions.Role', null=True, blank=True, on_delete=models.SET_NULL, related_name="users")
    assigned_class = models.ForeignKey('students.Class', null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_teachers")
    individual_permissions = models.ManyToManyField(
        'permissions.Permission', blank=True,
        related_name='users_individual',
        help_text='Extra permissions granted to this user on top of their role'
    )
    
    phone       = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

    def has_perm_code(self, codename):
        """Check role permissions + individual overrides."""
        if self.is_superuser:
            return True
        # Check individual user-level permissions first
        if self.individual_permissions.filter(codename=codename).exists():
            return True
        # Then check role permissions
        if self.role and self.role.permissions.filter(codename=codename).exists():
            return True
        return False

    def get_class_filter(self):
        """Returns queryset filter kwargs scoped to this user's class."""
        if self.assigned_class:
            return {'section__school_class': self.assigned_class}
        return {}

    class Meta:
        db_table = "users"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    photo = models.ImageField(upload_to="profiles/", null=True, blank=True)
    signature = models.ImageField(upload_to="profiles/signatures/", null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[("male", "Male"), ("female", "Female"), ("other", "Other")], blank=True)
    address = models.TextField(blank=True)
    aadhaar_number = models.CharField(max_length=12, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    health_notes = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    
    # Parent/Guardian Details (Simplified storage for Student record)
    father_name = models.CharField(max_length=100, blank=True)
    father_occupation = models.CharField(max_length=100, blank=True)
    mother_name = models.CharField(max_length=100, blank=True)
    mother_occupation = models.CharField(max_length=100, blank=True)
    parent_phone = models.CharField(max_length=20, blank=True)
    parent_email = models.EmailField(blank=True)
    guardian_name = models.CharField(max_length=100, blank=True)
    guardian_relation = models.CharField(max_length=50, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_email = models.EmailField(blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile — {self.user.get_full_name()}"

    class Meta:
        db_table = "user_profiles"


class Parent(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="parent_profile")
    occupation = models.CharField(max_length=100, blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    students = models.ManyToManyField("students.Student", related_name="parents", blank=True)

    def __str__(self):
        return f"Parent — {self.user.get_full_name()}"

    class Meta:
        db_table = "parents"
