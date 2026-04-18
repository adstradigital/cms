from django.db import models
from apps.accounts.models import AcademicYear, User
from apps.students.models import Class, Section, Student
from apps.academics.models import Subject


class GradingScale(models.Model):
    name = models.CharField(max_length=100)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="grading_scales", null=True, blank=True)
    configuration_json = models.JSONField(default=dict)  # [{"min": 91, "max": 100, "grade": "A1", "gp": 10}, ...]
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "grading_scales"


class ExamType(models.Model):
    name = models.CharField(max_length=100)  # e.g., "Term 1", "Unit Test"
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="exam_types", null=True, blank=True)
    weightage_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    passing_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=35.00)
    max_theory_marks = models.PositiveSmallIntegerField(default=80)
    max_internal_marks = models.PositiveSmallIntegerField(default=20)
    grading_scale = models.ForeignKey(GradingScale, on_delete=models.SET_NULL, null=True, blank=True, related_name="exam_types")
    is_online = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "exam_types"


class Exam(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="exams")
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="exams")
    name = models.CharField(max_length=100)
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, related_name="exams")
    coordinator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="coordinated_exams")
    description = models.TextField(blank=True)
    is_online = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.school_class.name}"

    class Meta:
        db_table = "exams"


class ExamSchedule(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="schedules")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="exam_schedules")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_theory_marks = models.PositiveSmallIntegerField(default=80)
    max_internal_marks = models.PositiveSmallIntegerField(default=20)
    pass_marks = models.PositiveSmallIntegerField(default=35)
    venue = models.CharField(max_length=100, blank=True)
    invigilator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="invigilated_schedules")

    def __str__(self):
        return f"{self.exam.name} - {self.subject.name} on {self.date}"

    class Meta:
        db_table = "exam_schedules"
        unique_together = ("exam", "subject")


class HallTicket(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="hall_tickets")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="hall_tickets")
    seat_number = models.CharField(max_length=20, blank=True)
    is_eligible = models.BooleanField(default=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Hall Ticket - {self.student} - {self.exam.name}"

    class Meta:
        db_table = "hall_tickets"
        unique_together = ("student", "exam")


class ExamResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="exam_results")
    exam_schedule = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE, related_name="results")
    theory_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    internal_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True) # Usually Theory + Internal
    grade = models.CharField(max_length=5, blank=True)
    is_absent = models.BooleanField(default=False)
    remarks = models.CharField(max_length=255, blank=True)
    entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="results_entered")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.exam_schedule.subject.name} - {self.marks_obtained}"

    class Meta:
        db_table = "exam_results"
        unique_together = ("student", "exam_schedule")

class ReportTemplate(models.Model):
    name = models.CharField(max_length=120)
    configuration_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
        
    class Meta:
        db_table = "report_templates"


class ReportCard(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="report_cards")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="report_cards")
    template = models.ForeignKey(ReportTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="generated_reports")
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    rank = models.PositiveSmallIntegerField(null=True, blank=True)
    teacher_remarks = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    pdf_file = models.FileField(upload_to="report_cards/", null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report - {self.student} - {self.exam.name}"

    class Meta:
        db_table = "report_cards"
        unique_together = ("student", "exam")


# ─── Questions & Online Tests ─────────────────────────────────────────────────────────────

class QuestionBank(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="questions", null=True, blank=True)
    text = models.TextField()
    question_type = models.CharField(max_length=50, choices=[("MCQ", "Multiple Choice"), ("Descriptive", "Descriptive"), ("True/False", "True/False")], default="MCQ")
    options = models.JSONField(default=list, blank=True) # list of strings or dicts
    correct_answer = models.CharField(max_length=255, blank=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    difficulty = models.CharField(max_length=20, choices=[
        ("Easy", "Easy"), ("Medium", "Medium"), ("Hard", "Hard")
    ], default="Medium")
    bloom_level = models.CharField(max_length=50, blank=True, choices=[
        ("remember", "Remember"), ("understand", "Understand"), 
        ("apply", "Apply"), ("analyze", "Analyze"), 
        ("evaluate", "Evaluate"), ("create", "Create")
    ])
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_questions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "question_bank"

    def __str__(self):
        return self.text[:50]


class QuestionPaper(models.Model):
    exam_schedule = models.OneToOneField(ExamSchedule, on_delete=models.CASCADE, related_name="question_paper", null=True, blank=True)
    name = models.CharField(max_length=150)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="question_papers", null=True, blank=True)
    questions = models.ManyToManyField(QuestionBank, related_name="papers")
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    duration_minutes = models.PositiveIntegerField(default=60)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="papers_created")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "question_papers"

    def __str__(self):
        return self.name


class OnlineTestAttempt(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="test_attempts")
    question_paper = models.ForeignKey(QuestionPaper, on_delete=models.CASCADE, related_name="attempts")
    status = models.CharField(max_length=20, choices=[
        ("in_progress", "In Progress"), 
        ("submitted", "Submitted"), 
        ("graded", "Graded")
    ], default="in_progress")
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "online_test_attempts"
        unique_together = ("student", "question_paper")


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(OnlineTestAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name="student_answers")
    submitted_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    marks_awarded = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "student_answers"
        unique_together = ("attempt", "question")


# ─── Online Test Module (v2) ──────────────────────────────────────────────────

GRADING_MODE_CHOICES = [
    ("auto", "Auto"),
    ("manual", "Manual"),
    ("mixed", "Mixed"),
]

RESULT_VISIBILITY_CHOICES = [
    ("instant", "Publish Immediately"),
    ("review", "Teacher Reviews First"),
]

QUESTION_TYPE_CHOICES = [
    ("mcq_single", "MCQ — Single Choice"),
    ("mcq_multi", "MCQ — Multiple Choice"),
    ("short", "Short Answer"),
    ("long", "Long / Descriptive"),
    ("truefalse", "True / False"),
    ("fill", "Fill in the Blank"),
    ("upload", "File Upload"),
    ("divider", "Section Divider"),
]

ATTEMPT_STATUS_CHOICES = [
    ("in_progress", "In Progress"),
    ("submitted", "Submitted"),
    ("graded", "Graded"),
    ("published", "Published"),
]


class OnlineTest(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "staff.Staff", on_delete=models.SET_NULL, null=True, blank=True, related_name="online_tests_created"
    )
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="online_tests")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="online_tests")
    grading_mode = models.CharField(max_length=10, choices=GRADING_MODE_CHOICES, default="mixed")
    result_visibility = models.CharField(max_length=10, choices=RESULT_VISIBILITY_CHOICES, default="review")
    duration_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Countdown timer in minutes. Null = no limit.")
    start_at = models.DateTimeField(null=True, blank=True, help_text="When the test becomes available.")
    end_at = models.DateTimeField(null=True, blank=True, help_text="When the test closes.")
    max_attempts = models.PositiveIntegerField(default=1)
    shuffle_questions = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "online_tests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.section}"

    @property
    def total_marks(self):
        return self.test_questions.exclude(question_type="divider").aggregate(
            total=models.Sum("marks")
        )["total"] or 0

    @property
    def question_count(self):
        return self.test_questions.exclude(question_type="divider").count()


class TestQuestion(models.Model):
    test = models.ForeignKey(OnlineTest, on_delete=models.CASCADE, related_name="test_questions")
    order = models.PositiveIntegerField(default=0)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default="mcq_single")
    text = models.TextField(help_text="The question prompt. Supports markdown.")
    marks = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    negative_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_required = models.BooleanField(default=True)
    image = models.ImageField(upload_to="test_questions/", null=True, blank=True)
    accepted_answers = models.JSONField(
        default=list, blank=True,
        help_text='For fill-in-the-blank: ["answer1", "synonym"]. Case-insensitive matching.'
    )

    class Meta:
        db_table = "test_questions"
        ordering = ["order"]

    def __str__(self):
        return f"Q{self.order}: {self.text[:60]}"


class TestChoice(models.Model):
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "test_choices"
        ordering = ["order"]

    def __str__(self):
        return f"{'✓' if self.is_correct else '✗'} {self.text[:40]}"


class TestAttempt(models.Model):
    test = models.ForeignKey(OnlineTest, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="test_attempts_v2")
    attempt_number = models.PositiveIntegerField(default=1)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    auto_score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    manual_score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=ATTEMPT_STATUS_CHOICES, default="in_progress")

    class Meta:
        db_table = "test_attempts"
        ordering = ["-started_at"]
        unique_together = ("test", "student", "attempt_number")

    def __str__(self):
        return f"{self.student} — Attempt {self.attempt_number} — {self.test.title}"

    @property
    def final_score(self):
        auto = self.auto_score or 0
        manual = self.manual_score or 0
        return auto + manual


class TestAnswer(models.Model):
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE, related_name="test_answers")
    selected_choices = models.ManyToManyField(TestChoice, blank=True, related_name="selected_in_answers")
    text_answer = models.TextField(blank=True)
    file_answer = models.FileField(upload_to="test_uploads/", null=True, blank=True)
    auto_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    manual_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    teacher_remark = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = "test_answers"
        unique_together = ("attempt", "question")

    def __str__(self):
        return f"Answer to Q{self.question.order} by {self.attempt.student}"