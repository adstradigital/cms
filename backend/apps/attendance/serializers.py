from rest_framework import serializers
from .models import Attendance, LeaveRequest, AttendanceWarning


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.get_full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = "__all__"


class BulkAttendanceSerializer(serializers.Serializer):
    section = serializers.IntegerField()
    subject = serializers.IntegerField(required=False)
    date = serializers.DateField()
    records = serializers.ListField(
        child=serializers.DictField()
    )


class LeaveRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = "__all__"
        read_only_fields = ["status", "reviewed_by", "reviewed_at"]


class AttendanceWarningSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    sent_by_name = serializers.CharField(source="sent_by.get_full_name", read_only=True)

    class Meta:
        model = AttendanceWarning
        fields = "__all__"
