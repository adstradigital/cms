from rest_framework import serializers
from .models import Exam, ExamSchedule, ExamResult, HallTicket, ReportCard


class ExamSerializer(serializers.ModelSerializer):
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
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    subject_name = serializers.CharField(source="exam_schedule.subject.name", read_only=True)
    max_marks = serializers.IntegerField(source="exam_schedule.max_marks", read_only=True)
    pass_marks = serializers.IntegerField(source="exam_schedule.pass_marks", read_only=True)

    class Meta:
        model = ExamResult
        fields = "__all__"


class HallTicketSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = HallTicket
        fields = "__all__"


class ReportCardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = ReportCard
        fields = "__all__"
