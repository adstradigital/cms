from django.db import models
from apps.accounts.models import User, AcademicYear
from apps.students.models import Class, Section

# Create your models here.




class GlobalSubject(models.Model):
    """A master library of all possible subjects across all campuses."""
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50, blank=True) # e.g. "Scholastic", "Co-Scholastic"
    description = models.TextField(blank=True)
    global_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "global_subjects"


class SyllabusMaster(models.Model):
    """A shareable curriculum blueprint that can be linked to multiple classes/campuses."""
    name = models.CharField(max_length=255)
    global_subject = models.ForeignKey(GlobalSubject, on_delete=models.CASCADE, related_name="syllabi")
    description = models.TextField(blank=True)
    version = models.CharField(max_length=20, default="1.0")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (v{self.version})"

    class Meta:
        db_table = "syllabus_masters"


class SubjectBundle(models.Model):
    """A template of subjects (e.g. 'Science Stream') that can be applied in bulk to classes."""
    school = models.ForeignKey("accounts.School", on_delete=models.CASCADE, related_name="subject_bundles", null=True, blank=True)
    name = models.CharField(max_length=100)
    subjects = models.ManyToManyField(GlobalSubject, related_name="bundles")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "subject_bundles"


class Subject(models.Model):
    TERM_CHOICES = [
        ("annual", "Annual"),
        ("semester", "Semester"),
        ("quarter", "Quarter"),
    ]
    school = models.ForeignKey("accounts.School", on_delete=models.CASCADE, related_name="subjects", null=True, blank=True)
    school_class = models.ForeignKey("students.Class", on_delete=models.CASCADE, related_name="subjects", null=True, blank=True)
    
    # Linked to the library
    global_subject = models.ForeignKey(GlobalSubject, on_delete=models.SET_NULL, null=True, blank=True, related_name="subject_instances")
    syllabus_master = models.ForeignKey(SyllabusMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name="subject_instances")
    
    name = models.CharField(max_length=100) # Instance name (can override global name)
    code = models.CharField(max_length=20) # No longer globally unique
    description = models.TextField(blank=True)
    weekly_periods = models.PositiveSmallIntegerField(default=5, help_text="Number of periods per week for this subject.")
    color_code = models.CharField(max_length=20, default="#3b82f6")
    term_type = models.CharField(max_length=20, choices=TERM_CHOICES, default="annual")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} — {self.school_class.name if self.school_class else 'N/A'}"

    class Meta:
        db_table = "subjects"
        unique_together = [
            ("school_class", "name"),
            ("school_class", "code")
        ]


class SyllabusUnit(models.Model):
    # Repointed from Subject to SyllabusMaster
    master = models.ForeignKey(SyllabusMaster, on_delete=models.CASCADE, related_name="units", null=True, blank=True)
    # Temporary fallback to keep existing data visible during migration
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="units", null=True, blank=True)
    
    title = models.CharField(max_length=255)
    order = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f"Unit {self.order}: {self.title}"

    class Meta:
        db_table = "syllabus_units"
        ordering = ["order"]


class SyllabusChapter(models.Model):
    unit = models.ForeignKey(SyllabusUnit, on_delete=models.CASCADE, related_name="chapters")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f"{self.unit.title} - Ch {self.order}: {self.title}"

    class Meta:
        db_table = "syllabus_chapters"
        ordering = ["order"]


class SyllabusTopic(models.Model):
    chapter = models.ForeignKey(SyllabusChapter, on_delete=models.CASCADE, related_name="topics")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=1)

    def __str__(self):
        return f"{self.chapter.title} - Topic {self.order}: {self.title}"

    class Meta:
        db_table = "syllabus_topics"
        ordering = ["order"]


class SubjectAllocation(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="allocations")
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="subject_allocations")
    teachers = models.ManyToManyField(User, related_name="allocated_subjects", blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="subject_allocations")

    def __str__(self):
        return f"{self.subject.name} in {self.section}"

    class Meta:
        db_table = "subject_allocations"
        unique_together = ("subject", "section", "academic_year")


class LessonPlan(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]
    allocation = models.ForeignKey(SubjectAllocation, on_delete=models.CASCADE, related_name="lesson_plans", null=True, blank=True)
    topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE, related_name="lesson_plans", null=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    planned_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.status}"

    class Meta:
        db_table = "lesson_plans"
        unique_together = ("allocation", "topic")


class Timetable(models.Model):
    DAY_CHOICES = [
        (1, "Monday"), (2, "Tuesday"), (3, "Wednesday"),
        (4, "Thursday"), (5, "Friday"), (6, "Saturday"), (7, "Sunday"),
    ]
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="timetable_entries")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="timetable_entries")
    day_of_week = models.PositiveSmallIntegerField(choices=DAY_CHOICES)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.section} — {self.get_day_of_week_display()}"

    class Meta:
        db_table = "timetables"
        unique_together = ("section", "academic_year", "day_of_week")


class Period(models.Model):
    PERIOD_TYPE_CHOICES = [
        ("class", "Class"),
        ("break", "Break"),
        ("lunch", "Lunch"),
        ("free", "Free"),
        ("custom", "Custom"),
    ]
    timetable = models.ForeignKey(Timetable, on_delete=models.CASCADE, related_name="periods")
    period_number = models.PositiveSmallIntegerField()
    period_type = models.CharField(max_length=10, choices=PERIOD_TYPE_CHOICES, default="class")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="periods")
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="periods")
    custom_title = models.CharField(max_length=100, blank=True, null=True, help_text="Custom name for event periods (e.g. CCA, Assembly)")
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"Period {self.period_number} — {self.timetable}"

    class Meta:
        db_table = "periods"
        unique_together = ("timetable", "period_number")
        ordering = ["period_number"]


class Homework(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="homework_list")
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="homework_list")
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="assigned_homework")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    attachment = models.FileField(upload_to="homework/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.subject.name}"

    class Meta:
        db_table = "homework"


class HomeworkSubmission(models.Model):
    homework = models.ForeignKey(Homework, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey("students.Student", on_delete=models.CASCADE, related_name="homework_submissions")
    submitted_file = models.FileField(upload_to="homework/submissions/", null=True, blank=True)
    remarks = models.TextField(blank=True)
    grade = models.CharField(max_length=10, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_late = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student} — {self.homework.title}"

    class Meta:
        db_table = "homework_submissions"
        unique_together = ("homework", "student")


class SubstituteLog(models.Model):
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="substitute_logs")
    original_teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="substituted_periods")
    substitute_teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="substitute_periods")
    date = models.DateField()
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} — {self.period} substitute by {self.substitute_teacher.get_full_name()}"

    class Meta:
        db_table = "substitute_logs"


class Assignment(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="assignments")
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="assignments")
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_assignments")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()
    attachment = models.FileField(upload_to="assignments/", null=True, blank=True)
    is_project = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} — {self.subject.name}"

    class Meta:
        db_table = "assignments"
        ordering = ["-created_at"]


class Material(models.Model):
    MATERIAL_TYPE_CHOICES = [
        ("video", "Video"),
        ("document", "Document"),
        ("link", "External Link"),
        ("other", "Other"),
    ]
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="materials")
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="materials")
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_materials")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    material_type = models.CharField(max_length=10, choices=MATERIAL_TYPE_CHOICES, default="document")
    file = models.FileField(upload_to="materials/", null=True, blank=True)
    external_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} — {self.subject.name}"

    class Meta:
        db_table = "materials"
        ordering = ["-created_at"]


class CourseSession(models.Model):
    SESSION_TYPE_CHOICES = [
        ("lecture", "Lecture"),
        ("lab", "Lab / Practical"),
        ("tutorial", "Tutorial"),
        ("revision", "Revision"),
        ("test", "Class Test"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="course_sessions")
    section       = models.ForeignKey("students.Section", on_delete=models.CASCADE, related_name="course_sessions")
    subject       = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="course_sessions")
    teacher       = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="course_sessions")
    session_type  = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default="lecture")
    title         = models.CharField(max_length=255, blank=True, help_text="Optional label; defaults to subject name if blank.")
    date          = models.DateField()
    start_time    = models.TimeField()
    end_time      = models.TimeField()
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    notes         = models.TextField(blank=True)
    created_by    = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="created_course_sessions")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        label = self.title or self.subject.name
        return f"{label} — {self.section} ({self.date})"

    class Meta:
        db_table = "course_sessions"
        ordering = ["-date", "start_time"]