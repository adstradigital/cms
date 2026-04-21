from rest_framework import serializers
from django.utils import timezone
from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier,
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog,
    CanteenConsumptionLog, FoodCategory, CanteenOrder, OrderItem, CanteenPayment,
    CanteenIngredient, CanteenDish, CanteenCombo,
    WeeklyMenu, CanteenNotification,
)


class FoodCategorySerializer(serializers.ModelSerializer):
    food_items_count = serializers.SerializerMethodField()
    food_items_preview = serializers.SerializerMethodField()

    def get_food_items_count(self, obj):
        annotated_count = getattr(obj, "food_items_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return obj.food_items.count()

    def get_food_items_preview(self, obj):
        # Limit preview to keep payload small for category cards.
        return [item.name for item in obj.food_items.all()[:3]]

    class Meta:
        model = FoodCategory
        fields = "__all__"


class FoodItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    is_available = serializers.SerializerMethodField()

    def get_is_available(self, obj):
        return obj.status == "active"

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
    food_items_detail = FoodItemSerializer(source="food_items", many=True, read_only=True)
    ingredients_detail = CanteenIngredientSerializer(source="ingredients", many=True, read_only=True)

    class Meta:
        model = DailyMenu
        fields = "__all__"


class WeeklyMenuSerializer(serializers.ModelSerializer):
    food_items_detail = FoodItemSerializer(source="food_items", many=True, read_only=True)

    class Meta:
        model = WeeklyMenu
        fields = "__all__"


class CanteenComplaintSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        try:
            return obj.user.get_full_name() or obj.user.username
        except Exception:
            return "Unknown"

    class Meta:
        model = CanteenComplaint
        fields = "__all__"


class CanteenSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenSupplier
        fields = "__all__"


class CanteenInventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()

    def get_is_low_stock(self, obj):
        return float(obj.current_stock) <= float(obj.min_stock_level)

    class Meta:
        model = CanteenInventoryItem
        fields = "__all__"


class CanteenInventoryLogSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    def get_item_name(self, obj):
        try:
            return obj.item.name
        except Exception:
            return None

    def get_supplier_name(self, obj):
        try:
            return obj.supplier.name if obj.supplier else None
        except Exception:
            return None

    def get_recorded_by_name(self, obj):
        try:
            return obj.recorded_by.get_full_name() if obj.recorded_by else None
        except Exception:
            return None

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


class OrderItemSerializer(serializers.ModelSerializer):
    food_item_name = serializers.SerializerMethodField()
    food_item_category = serializers.SerializerMethodField()

    def get_food_item_name(self, obj):
        try:
            return obj.food_item.name
        except Exception:
            return None

    def get_food_item_category(self, obj):
        try:
            return obj.food_item.category.name
        except Exception:
            return None

    class Meta:
        model = OrderItem
        fields = "__all__"
        read_only_fields = ["order", "unit_price", "subtotal"]


class CanteenPaymentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    def get_status(self, obj):
        return "refunded" if obj.is_refunded else "completed"

    def get_created_at(self, obj):
        return obj.payment_date

    class Meta:
        model = CanteenPayment
        fields = "__all__"


class CanteenOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField() # Backward compatibility
    order_items_detail = OrderItemSerializer(source="order_items", many=True, read_only=True)
    order_items = OrderItemSerializer(many=True, write_only=True, required=False)
    items_detail = FoodItemSerializer(source="items", many=True, read_only=True)

    def get_customer_name(self, obj):
        try:
            if obj.student:
                return f"Student: {obj.student.user.get_full_name()}"
            if obj.staff:
                return f"Staff: {obj.staff.user.get_full_name()}"
            if obj.ordered_by:
                return f"Admin: {obj.ordered_by.get_full_name()}"
        except Exception:
            pass
        return "Walk-in Customer"

    def get_student_name(self, obj):
        return self.get_customer_name(obj)

    class Meta:
        model = CanteenOrder
        fields = "__all__"
        read_only_fields = ["total_amount", "token_number", "order_date"]

    def create(self, validated_data):
        from django.db import transaction
        order_items_data = validated_data.pop('order_items', [])
        
        with transaction.atomic():
            # Auto-generate token number if not provided
            if not validated_data.get('token_number'):
                last_order = CanteenOrder.objects.filter(order_date__date=timezone.now().date()).order_by('token_number').last()
                validated_data['token_number'] = (last_order.token_number + 1) if (last_order and last_order.token_number) else 1
            
            # Pre-calculate total amount from order items
            total_amount = 0
            for item_data in order_items_data:
                food_item = item_data['food_item']
                quantity = item_data['quantity']
                unit_price = item_data.get('unit_price', food_item.price)
                total_amount += (quantity * unit_price)
            
            validated_data['total_amount'] = total_amount
            order = CanteenOrder.objects.create(**validated_data)
            
            for item_data in order_items_data:
                food_item = item_data['food_item']
                quantity = item_data['quantity']
                unit_price = item_data.get('unit_price', food_item.price)
                subtotal = quantity * unit_price
                
                OrderItem.objects.create(
                    order=order,
                    food_item=food_item,
                    quantity=quantity,
                    unit_price=unit_price,
                    subtotal=subtotal
                )
                
                # Update food item popularity
                food_item.times_ordered += quantity
                food_item.save()
            
            # ── Handle Automatic Payment Creation ──
            if validated_data.get('payment_status') == 'paid':
                CanteenPayment.objects.create(
                    order=order,
                    payment_method=validated_data.get('payment_method', 'cash'),
                    amount=total_amount
                )
            
            return order
