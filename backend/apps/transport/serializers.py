from decimal import Decimal

from rest_framework import serializers

from .models import (
    BusLocationLog,
    RouteStop,
    SchoolBus,
    StudentTransport,
    TransportComplaint,
    TransportFee,
    TransportFeePayment,
    TransportRoute,
)


class RouteStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteStop
        fields = "__all__"


class SchoolBusSerializer(serializers.ModelSerializer):
    driver_user_name = serializers.CharField(source="driver.get_full_name", read_only=True)
    current_location = serializers.SerializerMethodField()

    class Meta:
        model = SchoolBus
        fields = "__all__"

    def get_current_location(self, obj):
        latest = obj.location_logs.order_by("-recorded_at").first()
        if not latest:
            return None
        return {
            "latitude": latest.latitude,
            "longitude": latest.longitude,
            "speed_kmph": latest.speed_kmph,
            "recorded_at": latest.recorded_at,
        }


class TransportRouteSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source="driver.get_full_name", read_only=True)
    bus_name = serializers.CharField(source="bus.name", read_only=True)
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = TransportRoute
        fields = "__all__"


class StudentTransportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    stop_name = serializers.CharField(source="stop.stop_name", read_only=True)
    route_name = serializers.CharField(source="stop.route.name", read_only=True)
    route = serializers.IntegerField(source="stop.route.id", read_only=True)
    bus = serializers.IntegerField(source="stop.route.bus.id", read_only=True)
    bus_name = serializers.CharField(source="stop.route.bus.name", read_only=True)

    class Meta:
        model = StudentTransport
        fields = "__all__"


class BusLocationLogSerializer(serializers.ModelSerializer):
    bus_name = serializers.CharField(source="bus.name", read_only=True)
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    route_name = serializers.CharField(source="route.name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = BusLocationLog
        fields = "__all__"


class TransportFeePaymentSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True)

    class Meta:
        model = TransportFeePayment
        fields = "__all__"


class TransportFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    route_name = serializers.CharField(source="route.name", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True)
    balance = serializers.SerializerMethodField()
    payments = TransportFeePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = TransportFee
        fields = "__all__"
        read_only_fields = ["collected_by"]

    def get_balance(self, obj):
        due = obj.amount_due or Decimal("0")
        paid = obj.amount_paid or Decimal("0")
        bal = due - paid
        if bal < Decimal("0"):
            return Decimal("0")
        return bal


class TransportFeePaySerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=TransportFee.PAYMENT_METHOD_CHOICES)
    payment_date = serializers.DateField(required=False)
    transaction_id = serializers.CharField(required=False, allow_blank=True, max_length=120)
    remarks = serializers.CharField(required=False, allow_blank=True)


class TransportComplaintSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)
    route_name = serializers.CharField(source="route.name", read_only=True)
    bus_name = serializers.CharField(source="bus.name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.get_full_name", read_only=True)

    class Meta:
        model = TransportComplaint
        fields = "__all__"
        read_only_fields = ["raised_by", "resolved_by"]
