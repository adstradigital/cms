from rest_framework import serializers
from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier, 
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog, 
    CanteenConsumptionLog, FoodCategory, CanteenOrder,
    CanteenIngredient, CanteenDish, CanteenCombo
)

class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = "__all__"

class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = "__all__"

class CanteenIngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenIngredient
        fields = "__all__"

class CanteenDishSerializer(serializers.ModelSerializer):
    ingredients_detail = CanteenIngredientSerializer(source="ingredients", many=True, read_only=True)
    
    class Meta:
        model = CanteenDish
        fields = "__all__"

class DailyMenuSerializer(serializers.ModelSerializer):
    dishes_detail = CanteenDishSerializer(source="dishes", many=True, read_only=True)
    ingredients_detail = CanteenIngredientSerializer(source="ingredients", many=True, read_only=True)
    
    class Meta:
        model = DailyMenu
        fields = "__all__"

class CanteenComplaintSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    
    class Meta:
        model = CanteenComplaint
        fields = "__all__"

class CanteenSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenSupplier
        fields = "__all__"

class CanteenInventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenInventoryItem
        fields = "__all__"

class CanteenInventoryLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = CanteenInventoryLog
        fields = "__all__"

class CanteenWastageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenWastageLog
        fields = "__all__"

class CanteenConsumptionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenConsumptionLog
        fields = "__all__"

class CanteenComboSerializer(serializers.ModelSerializer):
    dishes_detail = CanteenDishSerializer(source="dishes", many=True, read_only=True)

    class Meta:
        model = CanteenCombo
        fields = "__all__"


class CanteenOrderSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    items_detail = FoodItemSerializer(source="items", many=True, read_only=True)
    
    class Meta:
        model = CanteenOrder
        fields = "__all__"
