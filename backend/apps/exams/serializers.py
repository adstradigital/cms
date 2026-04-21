from rest_framework import serializers
from .models import (
    Exam, ExamSchedule, ExamResult, HallTicket, ReportCard,
    GradingScale, ExamType, ReportTemplate, QuestionBank,
    QuestionPaper, OnlineTestAttempt, StudentAnswer
)

class GradingScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingScale
        fields = "__all__"

class ExamTypeSerializer(serializers.ModelSerializer):
    grading_scale_details = GradingScaleSerializer(source="grading_scale", read_only=True)

    class Meta:
        model = ExamType
        fields = "__all__"

class ExamSerializer(serializers.ModelSerializer):
    exam_type_details = ExamTypeSerializer(source="exam_type", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)

    class Meta:
        model = Exam
        fields = "__all__"

class ExamScheduleSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = ExamSchedule
        fields = "__all__"

class ExamResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    subject_name = serializers.CharField(source="exam_schedule.subject.name", read_only=True)
    max_theory_marks = serializers.IntegerField(source="exam_schedule.max_theory_marks", read_only=True)
    max_internal_marks = serializers.IntegerField(source="exam_schedule.max_internal_marks", read_only=True)
    entered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ExamResult
        fields = "__all__"

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"

    def get_entered_by_name(self, obj):
        if obj.entered_by:
            return f"{obj.entered_by.first_name} {obj.entered_by.last_name}".strip()
        return None

class HallTicketSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = HallTicket
        fields = "__all__"

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = "__all__"

class ReportCardSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = ReportCard
        fields = "__all__"

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"

class QuestionBankSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="text")
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = QuestionBank
        fields = [
            "id", "subject", "subject_name", "academic_year", "question_text", 
            "question_type", "options", "correct_answer", "marks", 
            "difficulty", "bloom_level", "created_by", "created_at"
        ]

class QuestionPaperSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    questions_details = QuestionBankSerializer(source="questions", many=True, read_only=True)

    class Meta:
        model = QuestionPaper
        fields = "__all__"

class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = "__all__"

class OnlineTestAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    paper_name = serializers.CharField(source="question_paper.name", read_only=True)
    answers = StudentAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = OnlineTestAttempt
        fields = "__all__"

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"


# ─── Online Test v2 Serializers ───────────────────────────────────────────────

from .models import OnlineTest, TestQuestion, TestChoice, TestAttempt, TestAnswer


class TestChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestChoice
        fields = ["id", "text", "is_correct", "order"]

class TestQuestionSerializer(serializers.ModelSerializer):
    choices = TestChoiceSerializer(many=True, read_only=True)
    choices_data = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = TestQuestion
        fields = [
            "id", "test", "order", "question_type", "text", "marks",
            "negative_marks", "is_required", "image", "accepted_answers",
            "choices", "choices_data",
        ]

    def create(self, validated_data):
        choices_data = validated_data.pop("choices_data", [])
        question = TestQuestion.objects.create(**validated_data)
        for i, choice in enumerate(choices_data):
            TestChoice.objects.create(
                question=question,
                text=choice.get("text", ""),
                is_correct=choice.get("is_correct", False),
                order=choice.get("order", i),
            )
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop("choices_data", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if choices_data is not None:
            instance.choices.all().delete()
            for i, choice in enumerate(choices_data):
                TestChoice.objects.create(
                    question=instance,
                    text=choice.get("text", ""),
                    is_correct=choice.get("is_correct", False),
                    order=choice.get("order", i),
                )
        return instance


class OnlineTestSerializer(serializers.ModelSerializer):
    test_questions = TestQuestionSerializer(many=True, read_only=True)
    total_marks = serializers.ReadOnlyField()
    question_count = serializers.ReadOnlyField()
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()

    class Meta:
        model = OnlineTest
        fields = [
            "id", "title", "description", "created_by", "section", "subject",
            "grading_mode", "result_visibility", "duration_minutes",
            "start_at", "end_at", "max_attempts", "shuffle_questions",
            "is_published", "created_at", "updated_at",
            "test_questions", "total_marks", "question_count",
            "section_name", "subject_name", "created_by_name", "attempt_count",
        ]

    def get_section_name(self, obj):
        if obj.section:
            class_name = getattr(obj.section, "class_name", None)
            if class_name:
                return f"{class_name} - {obj.section.name}"
            return obj.section.name
        return ""

    def get_created_by_name(self, obj):
        if obj.created_by and obj.created_by.user:
            u = obj.created_by.user
            return f"{u.first_name} {u.last_name}".strip()
        return ""

    def get_attempt_count(self, obj):
        return obj.attempts.count()


class OnlineTestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no nested questions)."""
    total_marks = serializers.ReadOnlyField()
    question_count = serializers.ReadOnlyField()
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    pending_count = serializers.SerializerMethodField()

    class Meta:
        model = OnlineTest
        fields = [
            "id", "title", "description", "created_by", "section", "subject",
            "grading_mode", "result_visibility", "duration_minutes",
            "start_at", "end_at", "max_attempts", "shuffle_questions",
            "is_published", "created_at",
            "total_marks", "question_count",
            "section_name", "subject_name", "created_by_name",
            "attempt_count", "graded_count", "pending_count",
        ]

    def get_section_name(self, obj):
        if obj.section:
            class_name = getattr(obj.section, "class_name", None)
            if class_name:
                return f"{class_name} - {obj.section.name}"
            return obj.section.name
        return ""

    def get_created_by_name(self, obj):
        if obj.created_by and obj.created_by.user:
            u = obj.created_by.user
            return f"{u.first_name} {u.last_name}".strip()
        return ""

    def get_attempt_count(self, obj):
        return obj.attempts.count()

    def get_graded_count(self, obj):
        return obj.attempts.filter(status__in=["graded", "published"]).count()

    def get_pending_count(self, obj):
        return obj.attempts.filter(status="submitted").count()


class TestAnswerSerializer(serializers.ModelSerializer):
    selected_choice_ids = serializers.PrimaryKeyRelatedField(
        source="selected_choices", queryset=TestChoice.objects.all(),
        many=True, required=False,
    )
    question_text = serializers.CharField(source="question.text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)
    question_marks = serializers.DecimalField(source="question.marks", max_digits=6, decimal_places=2, read_only=True)
    question_choices = TestChoiceSerializer(source="question.choices", many=True, read_only=True)

    class Meta:
        model = TestAnswer
        fields = [
            "id", "attempt", "question", "selected_choice_ids",
            "text_answer", "file_answer", "auto_score", "manual_score",
            "teacher_remark", "is_correct",
            "question_text", "question_type", "question_marks", "question_choices",
        ]


class TestAttemptSerializer(serializers.ModelSerializer):
    answers = TestAnswerSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    final_score = serializers.ReadOnlyField()
    test_title = serializers.CharField(source="test.title", read_only=True)
    total_marks = serializers.DecimalField(source="test.total_marks", max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            "id", "test", "student", "attempt_number", "started_at",
            "submitted_at", "auto_score", "manual_score", "status",
            "final_score", "answers", "student_name", "test_title", "total_marks",
        ]

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"


class TestAttemptListSerializer(serializers.ModelSerializer):
    """Lightweight for list views."""
    student_name = serializers.SerializerMethodField()
    final_score = serializers.ReadOnlyField()
    test_title = serializers.CharField(source="test.title", read_only=True)
    subject_name = serializers.CharField(source="test.subject.name", read_only=True, default="")
    total_marks = serializers.DecimalField(source="test.total_marks", max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            "id", "test", "student", "attempt_number", "started_at",
            "submitted_at", "auto_score", "manual_score", "status",
            "final_score", "student_name", "test_title", "subject_name", "total_marks",
        ]

    def get_student_name(self, obj):
        if obj.student and hasattr(obj.student, "user") and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}".strip()
        return "Unknown"
