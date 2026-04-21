from rest_framework import serializers
from .models import SalaryStructure, DeductionType, PayrollRun, PayrollEntry
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


class PayrollEntrySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    employee_id = serializers.CharField(source="staff.employee_id", read_only=True)
    designation = serializers.CharField(source="staff.designation", read_only=True)

    class Meta:
        model = PayrollEntry
        fields = "__all__"


class PayrollRunSerializer(serializers.ModelSerializer):
    entries = PayrollEntrySerializer(many=True, read_only=True)
    processed_by_name = serializers.CharField(source="processed_by.get_full_name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    total_gross = serializers.SerializerMethodField()
    total_net = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = "__all__"

    def get_total_gross(self, obj):
        return float(sum(e.gross_salary for e in obj.entries.all()))

    def get_total_net(self, obj):
        return float(sum(e.net_salary for e in obj.entries.all()))

    def get_staff_count(self, obj):
        return obj.entries.count()


class PayrollRunListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no nested entries)."""
    processed_by_name = serializers.CharField(source="processed_by.get_full_name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    staff_count = serializers.SerializerMethodField()
    total_net = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = ["id", "month", "year", "status", "academic_year", "academic_year_name",
                  "processed_by_name", "processed_at", "staff_count", "total_net", "created_at"]

    def get_staff_count(self, obj):
        return obj.entries.count()

    def get_total_net(self, obj):
        return float(sum(e.net_salary for e in obj.entries.all()))
