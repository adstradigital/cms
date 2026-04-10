from rest_framework import serializers

from .models import (
    Hostel,
    Floor,
    Room,
    RoomAllotment,
    RoomTransfer,
    NightAttendance,
    EntryExitLog,
    RuleViolation,
    VisitorLog,
    HostelFee,
    MessMenuPlan,
    MessMealAttendance,
    MessDietProfile,
    MessFeedback,
    MessInventoryItem,
    MessInventoryLog,
    MessVendor,
    MessVendorSupply,
    MessWastageLog,
    MessConsumptionLog,
    MessFoodOrder,
)


class HostelSerializer(serializers.ModelSerializer):
    warden_name = serializers.CharField(source="warden.get_full_name", read_only=True, default="")
    total_rooms = serializers.SerializerMethodField()
    occupied_rooms = serializers.SerializerMethodField()
    total_occupancy = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = "__all__"

    def get_total_rooms(self, obj):
        return obj.rooms.count()

    def get_occupied_rooms(self, obj):
        return obj.rooms.filter(status="full").count()

    def get_total_occupancy(self, obj):
        return obj.rooms.aggregate(
            total=__import__('django.db.models', fromlist=['Sum']).Sum('occupied')
        )['total'] or 0

    def get_total_students(self, obj):
        # Backward-compatible alias
        return self.get_total_occupancy(obj)


class FloorSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Floor
        fields = "__all__"

    def get_room_count(self, obj):
        return obj.rooms.count()


class RoomSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    floor_number = serializers.IntegerField(source="floor.number", read_only=True)
    available_beds = serializers.SerializerMethodField()
    occupancy_percent = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = "__all__"

    def get_available_beds(self, obj):
        return obj.capacity - obj.occupied

    def get_occupancy_percent(self, obj):
        if obj.capacity == 0:
            return 0
        return round((obj.occupied / obj.capacity) * 100)


class RoomAllotmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    hostel_name = serializers.CharField(source="room.hostel.name", read_only=True)
    floor_number = serializers.IntegerField(source="room.floor.number", read_only=True)
    allotted_by_name = serializers.CharField(source="allotted_by.get_full_name", read_only=True, default="")

    class Meta:
        model = RoomAllotment
        fields = "__all__"


class RoomTransferSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    from_room_number = serializers.CharField(source="from_room.room_number", read_only=True, default="")
    to_room_number = serializers.CharField(source="to_room.room_number", read_only=True)
    transferred_by_name = serializers.CharField(source="transferred_by.get_full_name", read_only=True, default="")

    class Meta:
        model = RoomTransfer
        fields = "__all__"


class NightAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.get_full_name", read_only=True, default="")

    class Meta:
        model = NightAttendance
        fields = "__all__"


class EntryExitLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    logged_by_name = serializers.CharField(source="logged_by.get_full_name", read_only=True, default="")

    class Meta:
        model = EntryExitLog
        fields = "__all__"


class RuleViolationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    reported_by_name = serializers.CharField(source="reported_by.get_full_name", read_only=True, default="")
    resolved_by_name = serializers.CharField(source="resolved_by.get_full_name", read_only=True, default="")

    class Meta:
        model = RuleViolation
        fields = "__all__"


class VisitorLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default="")
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = VisitorLog
        fields = "__all__"

    def get_duration_minutes(self, obj):
        if obj.check_out and obj.check_in:
            delta = obj.check_out - obj.check_in
            return round(delta.total_seconds() / 60)
        return None


class HostelFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True, default="")
    hostel_name = serializers.CharField(source="room.hostel.name", read_only=True, default="")
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True, default="")
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = HostelFee
        fields = "__all__"

    def get_balance_due(self, obj):
        return float(obj.amount_due) - float(obj.amount_paid)


class MessMenuPlanSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")

    class Meta:
        model = MessMenuPlan
        fields = "__all__"


class MessMealAttendanceSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.get_full_name", read_only=True, default="")

    class Meta:
        model = MessMealAttendance
        fields = "__all__"


class MessDietProfileSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)

    class Meta:
        model = MessDietProfile
        fields = "__all__"


class MessFeedbackSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)

    class Meta:
        model = MessFeedback
        fields = "__all__"


class MessInventoryItemSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = MessInventoryItem
        fields = "__all__"

    def get_low_stock(self, obj):
        return float(obj.current_stock) <= float(obj.minimum_stock)


class MessInventoryLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    hostel_name = serializers.CharField(source="item.hostel.name", read_only=True)
    logged_by_name = serializers.CharField(source="logged_by.get_full_name", read_only=True, default="")

    class Meta:
        model = MessInventoryLog
        fields = "__all__"


class MessVendorSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = MessVendor
        fields = "__all__"


class MessVendorSupplySerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)

    class Meta:
        model = MessVendorSupply
        fields = "__all__"


class MessWastageLogSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True, default="")

    class Meta:
        model = MessWastageLog
        fields = "__all__"


class MessConsumptionLogSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True, default="")

    class Meta:
        model = MessConsumptionLog
        fields = "__all__"


class MessFoodOrderSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    student_admission = serializers.CharField(source="student.admission_number", read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True)

    class Meta:
        model = MessFoodOrder
        fields = "__all__"
