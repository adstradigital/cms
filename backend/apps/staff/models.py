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


class StaffAttendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('on_leave', 'On Leave'),
        ('half_day', 'Half Day'),
    ]
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    in_time = models.TimeField(null=True, blank=True)
    out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='present')
    is_late = models.BooleanField(default=False)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff_attendance_marked")
    remarks = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "staff_attendance"
        unique_together = ("staff", "date")

    def __str__(self):
        return f"{self.staff} - {self.date} - {self.status}"


class StaffLeaveRequest(models.Model):
    TYPE_CHOICES = [
        ('sick', 'Sick Leave'),
        ('casual', 'Casual Leave'),
        ('emergency', 'Emergency Leave'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    from_date = models.DateField()
    to_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff_leave_reviews")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "staff_leave_requests"

    def __str__(self):
        return f"{self.staff} - {self.leave_type} - {self.status}"


class StaffTask(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('extension_requested', 'Extension Requested'),
    ]
    assigned_to = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="tasks")
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="assigned_staff_tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    deadline = models.DateTimeField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "staff_tasks"
        ordering = ["deadline"]

    def __str__(self):
        return f"{self.title} - {self.assigned_to}"


class ParentFeedback(models.Model):
    """Stores parent remarks/ratings for a specific teacher."""
    teacher = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="parent_feedbacks")
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE, related_name="feedbacks_given")
    rating = models.PositiveSmallIntegerField() # e.g. out of 5 or 10
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "parent_feedbacks"

    def __str__(self):
        return f"Feedback for {self.teacher} by {self.student}"


class TeacherLeaderboardSnapshot(models.Model):
    """Snapshot store of computed leaderboard metrics for a given term/academic year."""
    teacher = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="leaderboard_snapshots")
    academic_year = models.ForeignKey("accounts.AcademicYear", on_delete=models.CASCADE)
    term = models.CharField(max_length=50, blank=True) # e.g. "Term 1", "Mid Term"
    
    pass_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0) # % of students passed
    avg_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0) # out of 100
    trend_score = models.DecimalField(max_digits=5, decimal_places=2, default=0) # % improvement vs last snapshot
    assignment_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0) # %
    parent_rating = models.DecimalField(max_digits=4, decimal_places=2, default=0) # average out of 10
    
    composite_score = models.DecimalField(max_digits=5, decimal_places=2, default=0) # the weighted total score
    rank = models.PositiveSmallIntegerField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "teacher_leaderboard_snapshots"
        unique_together = ("teacher", "academic_year", "term")

    def __str__(self):
        return f"Rank {self.rank}: {self.teacher} - {self.composite_score}"
