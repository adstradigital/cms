from rest_framework import serializers
from django.utils import timezone
from apps.accounts.models import User
from apps.permissions.models import Role
from django.utils.text import slugify
from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier, CanteenVendor,
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog,
    CanteenConsumptionLog, FoodCategory, CanteenOrder, OrderItem, CanteenPayment,
    CanteenIngredient, CanteenDish, CanteenCombo,
    WeeklyMenu, CanteenNotification,
    CanteenPurchaseOrder, CanteenPurchaseOrderItem,
    CanteenStaffProfile, CanteenStaffAttendance, CanteenStaffTask,
    CanteenShift, CanteenStaffShiftAssignment,
    CanteenStaffDocument, CanteenStaffLeaveRequest, CanteenStaffPerformanceLog,
    CanteenStaffAnnouncement, CanteenPayrollRecord,
    CanteenInventoryCategory,
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




class CanteenInventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenInventoryCategory
        fields = "__all__"


class CanteenPurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    unit = serializers.CharField(source="inventory_item.unit", read_only=True)

    class Meta:
        model = CanteenPurchaseOrderItem
        fields = "__all__"


class CanteenPurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    items = CanteenPurchaseOrderItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = CanteenPurchaseOrder
        fields = "__all__"

    def create(self, validated_data):
        items_data = self.context.get('request').data.get('items', [])
        from django.db import transaction
        with transaction.atomic():
            po = CanteenPurchaseOrder.objects.create(**validated_data)
            total = 0
            for item_data in items_data:
                # Support both 'inventory_item' and 'inventory_item_id' from frontend
                item_id = item_data.get('inventory_item') or item_data.get('inventory_item_id')
                if item_id:
                    qty = float(item_data.get('quantity', 0))
                    price = float(item_data.get('unit_price', 0))
                    CanteenPurchaseOrderItem.objects.create(
                        purchase_order=po,
                        inventory_item_id=item_id,
                        quantity=qty,
                        unit_price=price
                    )
                    total += (qty * price)
            
            po.total_amount = total
            po.save()
            return po


class CanteenVendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenVendor
        fields = "__all__"


class CanteenInventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenInventoryCategory
        fields = "__all__"


class CanteenInventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    days_to_expiry = serializers.SerializerMethodField()

    def get_is_low_stock(self, obj):
        return float(obj.current_stock) <= float(obj.min_stock_level)

    def get_days_to_expiry(self, obj):
        if obj.expiry_date:
            delta = obj.expiry_date - timezone.now().date()
            return delta.days
        return None

    class Meta:
        model = CanteenInventoryItem
        fields = "__all__"


class CanteenSupplierSerializer(serializers.ModelSerializer):
    categories_detail = CanteenInventoryCategorySerializer(source="categories", many=True, read_only=True)
    items_detail = CanteenInventoryItemSerializer(source="supplied_items", many=True, read_only=True)
    
    # Write-only fields for multiple selection
    category_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    item_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = CanteenSupplier
        fields = "__all__"

    def create(self, validated_data):
        category_ids = validated_data.pop('category_ids', [])
        item_ids = validated_data.pop('item_ids', [])
        
        from django.db import transaction
        with transaction.atomic():
            supplier = CanteenSupplier.objects.create(**validated_data)
            if category_ids:
                supplier.categories.set(category_ids)
            
            if item_ids:
                from .models import CanteenInventoryItem
                CanteenInventoryItem.objects.filter(id__in=item_ids).update(supplier=supplier)
                
            return supplier

    def update(self, instance, validated_data):
        category_ids = validated_data.pop('category_ids', [])
        item_ids = validated_data.pop('item_ids', [])
        
        from django.db import transaction
        with transaction.atomic():
            supplier = super().update(instance, validated_data)
            
            if 'category_ids' in self.initial_data: # Only update if provided
                supplier.categories.set(category_ids)
            
            if 'item_ids' in self.initial_data:
                from .models import CanteenInventoryItem
                # Clear old items (set supplier to null)
                CanteenInventoryItem.objects.filter(supplier=supplier).update(supplier=None)
                # Set new items
                CanteenInventoryItem.objects.filter(id__in=item_ids).update(supplier=supplier)
                
            return supplier


class CanteenStaffProfileSerializer(serializers.ModelSerializer):
    class UserIdOrUsernameField(serializers.PrimaryKeyRelatedField):
        def _request_can_create_user(self, request):
            # Only allow privileged users to auto-create accounts from this endpoint.
            if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
                return False
            if request.user.is_superuser:
                return True
            role_name = getattr(getattr(request.user, "role", None), "name", "") or ""
            return role_name.strip().lower() in {"admin", "super_admin", "principal"}

        def _unique_username(self, base):
            base = (base or "").strip()
            if not base:
                base = "canteen_staff"

            base_slug = slugify(base)
            if not base_slug:
                base_slug = "canteen_staff"
            base_slug = base_slug.replace("-", "_")[:140]

            candidate = base_slug
            suffix = 1
            while User.objects.filter(username__iexact=candidate).exists():
                suffix += 1
                candidate = f"{base_slug}_{suffix}"[:150]
            return candidate

        def to_internal_value(self, data):
            if isinstance(data, str):
                cleaned = data.strip()
                if cleaned and not cleaned.isdigit():
                    try:
                        return User.objects.get(username__iexact=cleaned)
                    except User.DoesNotExist as exc:
                        request = self.context.get("request")
                        if self._request_can_create_user(request):
                            # Auto-create a user if a username is provided but doesn't exist.
                            raw_username = cleaned.split("@", 1)[0].strip() or cleaned
                            username = self._unique_username(raw_username)

                            # Use the input as a name hint (e.g. "Mary Jane" -> first/last).
                            parts = cleaned.split()
                            first_name = (parts[0] if parts else cleaned)[:150]
                            last_name = (" ".join(parts[1:]) if len(parts) > 1 else "")[:150]

                            phone = ""
                            try:
                                phone = str(request.data.get("phone") or "").strip()[:20]
                            except Exception:
                                phone = ""

                            role = Role.objects.filter(name__iexact="staff").first()
                            user = User(
                                username=username,
                                first_name=first_name,
                                last_name=last_name,
                                phone=phone,
                                school=getattr(request.user, "school", None),
                                role=role,
                            )
                            user.set_unusable_password()
                            user.save()
                            return user

                        raise serializers.ValidationError(
                            "User not found. Enter a valid user id or username."
                        ) from exc
                data = cleaned
            return super().to_internal_value(data)

    user = UserIdOrUsernameField(queryset=User.objects.all())
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    attendance_stats = serializers.SerializerMethodField()

    def validate_user(self, user):
        try:
            user.canteen_staff_profile
        except CanteenStaffProfile.DoesNotExist:
            return user
        raise serializers.ValidationError("This user already has a canteen staff profile.")

    def get_attendance_stats(self, obj):
        total = obj.attendance.count()
        present = obj.attendance.filter(status="present").count()
        return {
            "total_records": total,
            "present_count": present,
            "attendance_percentage": (present / total * 100) if total > 0 else 0
        }

    class Meta:
        model = CanteenStaffProfile
        fields = "__all__"


class CanteenStaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    role = serializers.CharField(source="staff.role", read_only=True)

    class Meta:
        model = CanteenStaffAttendance
        fields = "__all__"


class CanteenStaffTaskSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)

    class Meta:
        model = CanteenStaffTask
        fields = "__all__"


class CanteenStaffDocumentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)

    class Meta:
        model = CanteenStaffDocument
        fields = "__all__"


class CanteenShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanteenShift
        fields = "__all__"


class CanteenStaffShiftAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    role = serializers.CharField(source="staff.role", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    shift_start = serializers.TimeField(source="shift.start_time", read_only=True)
    shift_end = serializers.TimeField(source="shift.end_time", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CanteenStaffShiftAssignment
        fields = "__all__"


class CanteenStaffLeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    role = serializers.CharField(source="staff.role", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)
    days = serializers.SerializerMethodField()

    def get_days(self, obj):
        if not obj.from_date or not obj.to_date:
            return None
        try:
            return (obj.to_date - obj.from_date).days + 1
        except Exception:
            return None

    class Meta:
        model = CanteenStaffLeaveRequest
        fields = "__all__"


class CanteenStaffPerformanceLogSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    role = serializers.CharField(source="staff.role", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = CanteenStaffPerformanceLog
        fields = "__all__"


class CanteenStaffAnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    target_staff_name = serializers.CharField(source="target_staff.user.get_full_name", read_only=True)

    class Meta:
        model = CanteenStaffAnnouncement
        fields = "__all__"


class CanteenPayrollRecordSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.get_full_name", read_only=True)
    role = serializers.CharField(source="staff.role", read_only=True)
    generated_by_name = serializers.CharField(source="generated_by.get_full_name", read_only=True)

    class Meta:
        model = CanteenPayrollRecord
        fields = "__all__"


class CanteenInventoryLogSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
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

    def get_vendor_name(self, obj):
        try:
            return obj.vendor.name if obj.vendor else None
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
