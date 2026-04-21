from rest_framework import serializers
from .models import ExpenseCategory, ExpenseEntry, ExpenseApproval


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = "__all__"


class ExpenseApprovalSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = ExpenseApproval
        fields = "__all__"


class ExpenseEntrySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    submitted_by_name = serializers.CharField(source="submitted_by.get_full_name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    approval = ExpenseApprovalSerializer(read_only=True)

    class Meta:
        model = ExpenseEntry
        fields = "__all__"
        read_only_fields = ["submitted_by", "status"]
