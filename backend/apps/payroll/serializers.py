from rest_framework import serializers
from .models import SalaryStructure, DeductionType, PayrollRun, PayrollEntry, IncrementHistory
from apps.staff.models import Staff


class SalaryStructureSerializer(serializers.ModelSerializer):
    gross_salary = serializers.SerializerMethodField()

    class Meta:
        model = SalaryStructure
        fields = "__all__"

    def get_gross_salary(self, obj):
        return float(obj.gross_salary())


class DeductionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeductionType
        fields = "__all__"


class IncrementHistorySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    employee_id = serializers.CharField(source="staff.employee_id", read_only=True)
    designation = serializers.CharField(source="staff.designation", read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    increment_type_display = serializers.CharField(source="get_increment_type_display", read_only=True)

    class Meta:
        model = IncrementHistory
        fields = "__all__"

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name()
        return None


class PayrollEntrySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    employee_id = serializers.CharField(source="staff.employee_id", read_only=True)
    designation = serializers.CharField(source="staff.designation", read_only=True)
    email = serializers.SerializerMethodField()

    class Meta:
        model = PayrollEntry
        fields = "__all__"

    def get_email(self, obj):
        if obj.staff and obj.staff.user:
            return obj.staff.user.email
        return ""


class PayrollRunSerializer(serializers.ModelSerializer):
    entries = PayrollEntrySerializer(many=True, read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    total_gross = serializers.SerializerMethodField()
    total_net = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()
    total_incentives = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = "__all__"

    def get_processed_by_name(self, obj):
        return obj.processed_by.get_full_name() if obj.processed_by else None

    def get_academic_year_name(self, obj):
        return obj.academic_year.name if obj.academic_year else None

    def get_total_gross(self, obj):
        return float(sum(e.gross_salary for e in obj.entries.all()))

    def get_total_net(self, obj):
        return float(sum(e.net_salary for e in obj.entries.all()))

    def get_total_deductions(self, obj):
        return float(sum(e.total_deductions for e in obj.entries.all()))

    def get_total_incentives(self, obj):
        return float(sum(e.incentive_amount for e in obj.entries.all()))

    def get_staff_count(self, obj):
        return obj.entries.count()


class PayrollRunListSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()
    total_net = serializers.SerializerMethodField()
    total_gross = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = [
            "id", "month", "year", "status",
            "academic_year", "academic_year_name",
            "processed_by_name", "processed_at",
            "staff_count", "total_net", "total_gross", "total_deductions",
            "created_at", "remarks",
        ]

    def get_processed_by_name(self, obj):
        return obj.processed_by.get_full_name() if obj.processed_by else None

    def get_academic_year_name(self, obj):
        return obj.academic_year.name if obj.academic_year else None

    def get_staff_count(self, obj):
        return obj.entries.count()

    def get_total_net(self, obj):
        return float(sum(e.net_salary for e in obj.entries.all()))

    def get_total_gross(self, obj):
        return float(sum(e.gross_salary for e in obj.entries.all()))

    def get_total_deductions(self, obj):
        return float(sum(e.total_deductions for e in obj.entries.all()))
