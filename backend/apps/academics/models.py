from django.db import models
from apps.accounts.models import User, AcademicYear
from apps.students.models import Class, Section

# Create your models here.




class Subject(models.Model):
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="subjects")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="subjects")
    max_marks = models.PositiveSmallIntegerField(default=100)
    is_optional = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} — {self.school_class.name}"

    class Meta:
        db_table = "subjects"
        unique_together = ("school_class", "name")


class Timetable(models.Model):
    DAY_CHOICES = [
        (1, "Monday"), (2, "Tuesday"), (3, "Wednesday"),
        (4, "Thursday"), (5, "Friday"), (6, "Saturday"),
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
    ]
    timetable = models.ForeignKey(Timetable, on_delete=models.CASCADE, related_name="periods")
    period_number = models.PositiveSmallIntegerField()
    period_type = models.CharField(max_length=10, choices=PERIOD_TYPE_CHOICES, default="class")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="periods")
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="periods")
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