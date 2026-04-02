from rest_framework import serializers
from .models import FeeCategory, FeeStructure, FeePayment


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = "__all__"


class FeeStructureSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)

    class Meta:
        model = FeeStructure
        fields = "__all__"


class FeePaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    category_name = serializers.CharField(source="fee_structure.category.name", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True)
    total_due = serializers.SerializerMethodField()

    class Meta:
        model = FeePayment
        fields = "__all__"
        read_only_fields = ["receipt_number", "collected_by"]

    def get_total_due(self, obj):
        return float(obj.fee_structure.amount) + float(obj.late_fine)


class FeePaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePayment
        fields = [
            "student", "fee_structure", "amount_paid",
            "late_fine", "payment_method", "transaction_id",
            "payment_date", "remarks",
        ]


class StudentFeeStatementSerializer(serializers.Serializer):
    """Read-only summary of a student's fee position."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    academic_year = serializers.CharField()
    total_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_due = serializers.DecimalField(max_digits=12, decimal_places=2)
    payments = FeePaymentSerializer(many=True)
