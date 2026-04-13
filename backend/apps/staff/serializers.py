from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import DatabaseError, ProgrammingError
from .models import Staff, TeacherDetail, StaffAttendance, StaffLeaveRequest, StaffTask, ParentFeedback, TeacherLeaderboardSnapshot
from apps.academics.models import SubjectAllocation
from apps.permissions.models import Role as RoleV2

User = get_user_model()

class StaffSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    role_name = serializers.CharField(source='user.role.name', read_only=True)
    user_role_id = serializers.IntegerField(source='user.role_id', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    teaching_subject_ids = serializers.SerializerMethodField()
    teaching_subject_names = serializers.SerializerMethodField()

    class Meta:
        model = Staff
        fields = [
            'id', 'user', 'full_name', 'email', 'phone', 'employee_id',
            'joining_date', 'status', 'is_teaching_staff', 'role_name',
            'user_role_id', 'is_active', 'experience_years', 'qualification',
            'first_name', 'last_name', 'teaching_subject_ids', 'teaching_subject_names'
        ]

    def get_teaching_subject_ids(self, obj):
        detail = getattr(obj, "teacher_detail", None)
        if not detail:
            return []
        try:
            return list(detail.teaching_subjects.values_list("id", flat=True))
        except (DatabaseError, ProgrammingError):
            return []

    def get_teaching_subject_names(self, obj):
        detail = getattr(obj, "teacher_detail", None)
        if not detail:
            return []
        try:
            return list(detail.teaching_subjects.values_list("name", flat=True))
        except (DatabaseError, ProgrammingError):
            return []


class StaffCreateSerializer(serializers.Serializer):
    # User fields
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    # Staff fields
    employee_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=100)
    joining_date = serializers.DateField()
    status = serializers.ChoiceField(choices=Staff.STATUS_CHOICES, required=False)
    is_teaching_staff = serializers.BooleanField(required=False)

    # Role assignment (roles_v2)
    role = serializers.IntegerField(required=False)

    # Teacher-only
    specialization = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    teaching_subject_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )

    def validate_role(self, value):
        if value is None:
            return value
        if not RoleV2.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Role not found.")
        return value


class StaffUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Staff.STATUS_CHOICES, required=False)
    designation = serializers.CharField(max_length=100, required=False)
    is_teaching_staff = serializers.BooleanField(required=False)

    # user updates
    role = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)
    teaching_subject_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )

    def validate_role(self, value):
        if value is None:
            return value
        if not RoleV2.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Role not found.")
        return value

class TeacherDetailSerializer(serializers.ModelSerializer):
    allocated_subjects = serializers.SerializerMethodField()
    teaching_subject_ids = serializers.SerializerMethodField()
    teaching_subject_names = serializers.SerializerMethodField()

    class Meta:
        model = TeacherDetail
        fields = ['specialization', 'bio', 'allocated_subjects', 'teaching_subject_ids', 'teaching_subject_names']

    def get_allocated_subjects(self, obj):
        allocations = SubjectAllocation.objects.filter(teachers=obj.staff.user)
        return [
            {
                'subject_name': a.subject.name,
                'section_name': a.section.name,
                'class_name': a.section.school_class.name
            } for a in allocations
        ]

    def get_teaching_subject_ids(self, obj):
        try:
            return list(obj.teaching_subjects.values_list("id", flat=True))
        except (DatabaseError, ProgrammingError):
            return []

    def get_teaching_subject_names(self, obj):
        try:
            return list(obj.teaching_subjects.values_list("name", flat=True))
        except (DatabaseError, ProgrammingError):
            return []


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)

    class Meta:
        model = StaffAttendance
        fields = '__all__'


class StaffLeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = StaffLeaveRequest
        fields = '__all__'


class StaffTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)

    class Meta:
        model = StaffTask
        fields = '__all__'


class TeacherLeaderboardSnapshotSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = TeacherLeaderboardSnapshot
        fields = '__all__'
