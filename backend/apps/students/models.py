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
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="admission_inquiries")
    guardian_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField(blank=True)
    student_name = models.CharField(max_length=255)
    class_requested = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, related_name="admission_inquiries")
    previous_school = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="New")
    notes = models.TextField(blank=True)
    inquiry_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Inquiry: {self.student_name} ({self.status})"

    class Meta:
        db_table = "admission_inquiries"
        ordering = ["-inquiry_date"]
