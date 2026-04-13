from rest_framework import serializers
from .models import (
    Subject, SyllabusUnit, SyllabusChapter, SyllabusTopic, SubjectAllocation, LessonPlan,
    Timetable, Period, Homework, HomeworkSubmission, SubstituteLog, Assignment, Material,
    CourseSession,
)



class LessonPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlan
        fields = ["id", "allocation", "topic", "status", "planned_date", "actual_date", "description"]


class SyllabusTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyllabusTopic
        fields = "__all__"


class SyllabusChapterSerializer(serializers.ModelSerializer):
    topics = SyllabusTopicSerializer(many=True, read_only=True)

    class Meta:
        model = SyllabusChapter
        fields = ["id", "unit", "title", "order", "topics"]


class SyllabusUnitSerializer(serializers.ModelSerializer):
    chapters = SyllabusChapterSerializer(many=True, read_only=True)

    class Meta:
        model = SyllabusUnit
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    units = SyllabusUnitSerializer(many=True, read_only=True)
    allocation_count = serializers.IntegerField(source="allocations.count", read_only=True)

    class Meta:
        model = Subject
        fields = "__all__"


class SubjectAllocationSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)
    class_name = serializers.CharField(source="section.school_class.name", read_only=True)
    teacher_names = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = SubjectAllocation
        fields = ["id", "subject", "section", "teachers", "academic_year", "subject_name", "section_name", "class_name", "teacher_names", "progress"]

    def get_teacher_names(self, obj):
        return ", ".join([t.get_full_name() for t in obj.teachers.all()])

    def get_progress(self, obj):
        total = SyllabusTopic.objects.filter(chapter__unit__subject=obj.subject).count()
        if total == 0: return 0
        completed = LessonPlan.objects.filter(allocation=obj, status="completed").count()
        return int((completed / total) * 100)


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


class AssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    section_name = serializers.SerializerMethodField()
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)

    class Meta:
        model = Assignment
        fields = "__all__"

    def get_section_name(self, obj):
        return f"{obj.section.school_class.name} — {obj.section.name}"


class MaterialSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    section_name = serializers.SerializerMethodField()
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    material_type_display = serializers.CharField(source="get_material_type_display", read_only=True)

    class Meta:
        model = Material
        fields = "__all__"

    def get_section_name(self, obj):
        return f"{obj.section.school_class.name} — {obj.section.name}"


class CourseSessionSerializer(serializers.ModelSerializer):
    subject_name    = serializers.CharField(source="subject.name", read_only=True)
    subject_color   = serializers.CharField(source="subject.color_code", read_only=True)
    section_name    = serializers.SerializerMethodField()
    class_name      = serializers.CharField(source="section.school_class.name", read_only=True)
    teacher_name    = serializers.SerializerMethodField()
    academic_year_label = serializers.SerializerMethodField()
    session_type_display = serializers.CharField(source="get_session_type_display", read_only=True)
    status_display  = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = [
            "id", "academic_year", "academic_year_label",
            "section", "section_name", "class_name",
            "subject", "subject_name", "subject_color",
            "teacher", "teacher_name",
            "session_type", "session_type_display",
            "title", "date", "start_time", "end_time",
            "status", "status_display", "notes",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by"]

    def get_section_name(self, obj):
        return f"{obj.section.school_class.name} — {obj.section.name}"

    def get_teacher_name(self, obj):
        if obj.teacher:
            return obj.teacher.get_full_name()
        return None

    def get_academic_year_label(self, obj):
        ay = obj.academic_year
        return f"{ay.start_date.year}–{ay.end_date.year}" if ay else ""

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
