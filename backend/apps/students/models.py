from django.db import models
from apps.accounts.models import User, School, AcademicYear

class Class(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="classes")
    name = models.CharField(max_length=50) # e.g. "Grade 1"
    code = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.school.name} — {self.name}"

    class Meta:
        db_table = "classes"
        unique_together = ("school", "name")
        verbose_name_plural = "Classes"


class Section(models.Model):
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="sections")
    name = models.CharField(max_length=50) # e.g. "A"
    class_teacher = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_section")
    room_number = models.CharField(max_length=50, blank=True)
    capacity = models.PositiveSmallIntegerField(default=40)

    def __str__(self):
        return f"{self.school_class.name} — {self.name}"

    class Meta:
        db_table = "sections"
        unique_together = ("school_class", "name")


class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    admission_number = models.CharField(max_length=50, unique=True)
    roll_number = models.CharField(max_length=50, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    admission_date = models.DateField(null=True, blank=True)
    hostel_resident = models.BooleanField(default=False)
    transport_user = models.BooleanField(default=False)
    previous_school = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.admission_number})"

    class Meta:
        db_table = "students"


class StudentDocument(models.Model):
    DOCUMENT_TYPES = [
        ("birth_certificate", "Birth Certificate"),
        ("previous_transcript", "Previous Transcript"),
        ("medical_record", "Medical Record"),
        ("aadhaar_card", "Aadhaar Card"),
        ("other", "Other"),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to="students/documents/")
    title = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.user.get_full_name()} — {self.get_document_type_display()}"

    class Meta:
        db_table = "student_documents"


class AdmissionInquiry(models.Model):
    STATUS_CHOICES = [
        ("New", "New"),
        ("Contacted", "Contacted"),
        ("Under Review", "Under Review"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
        ("Enrolled", "Enrolled"),
    ]
    SOURCE_CHOICES = [
        ("Website", "Website"),
        ("Phone Call", "Phone Call"),
        ("Referral", "Referral"),
        ("Walk-In", "Walk-In"),
        ("Social Media", "Social Media"),
        ("School Event", "School Event"),
        ("Agent", "Agent"),
        ("Other", "Other"),
    ]
    PRIORITY_CHOICES = [
        ("Hot", "Hot"),
        ("Warm", "Warm"),
        ("Cold", "Cold"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="admission_inquiries")
    guardian_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField(blank=True)
    student_name = models.CharField(max_length=255)
    class_requested = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, related_name="admission_inquiries")
    previous_school = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="New")
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="Other", blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="Warm")
    follow_up_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_leads"
    )
    notes = models.TextField(blank=True)
    inquiry_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Inquiry: {self.student_name} ({self.status})"

    class Meta:
        db_table = "admission_inquiries"
        ordering = ["-inquiry_date"]


class LeadActivity(models.Model):
    ACTIVITY_TYPES = [
        ("Call", "Call"),
        ("Email", "Email"),
        ("Visit", "Campus Visit"),
        ("Note", "Note"),
        ("Status Change", "Status Change"),
        ("Follow-up", "Follow-up Scheduled"),
    ]
    inquiry = models.ForeignKey(AdmissionInquiry, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="lead_activities")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.activity_type} — {self.inquiry.student_name}"

    class Meta:
        db_table = "lead_activities"
        ordering = ["-created_at"]
