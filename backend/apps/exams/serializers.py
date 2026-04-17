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
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = QuestionBank
        fields = "__all__"

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
