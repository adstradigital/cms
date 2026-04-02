from rest_framework import serializers
from .models import Subject, Timetable, Period, Homework, HomeworkSubmission, SubstituteLog


class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)

    class Meta:
        model = Subject
        fields = "__all__"


class PeriodSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)

    class Meta:
        model = Period
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    periods = PeriodSerializer(many=True, read_only=True)
    section_name = serializers.SerializerMethodField()
    day_label = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = Timetable
        fields = "__all__"

    def get_section_name(self, obj):
        return f"{obj.section.school_class.name} — {obj.section.name}"


class HomeworkSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    section_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)

    class Meta:
        model = Homework
        fields = "__all__"

    def get_section_name(self, obj):
        return f"{obj.section.school_class.name} — {obj.section.name}"


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    homework_title = serializers.CharField(source="homework.title", read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = "__all__"
        read_only_fields = ["submitted_at", "is_late"]


class SubstituteLogSerializer(serializers.ModelSerializer):
    original_teacher_name = serializers.CharField(source="original_teacher.get_full_name", read_only=True)
    substitute_teacher_name = serializers.CharField(source="substitute_teacher.get_full_name", read_only=True)
    period_info = serializers.SerializerMethodField()

    class Meta:
        model = SubstituteLog
        fields = "__all__"

    def get_period_info(self, obj):
        p = obj.period
        return {
            "period_number": p.period_number,
            "section": str(p.timetable.section),
            "subject": p.subject.name if p.subject else None,
        }
