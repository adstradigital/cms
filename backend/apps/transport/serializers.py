from rest_framework import serializers
from .models import TransportRoute, RouteStop, StudentTransport


class RouteStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteStop
        fields = "__all__"


class TransportRouteSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source="driver.get_full_name", read_only=True)
    stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = TransportRoute
        fields = "__all__"


class StudentTransportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    stop_name = serializers.CharField(source="stop.stop_name", read_only=True)
    route_name = serializers.CharField(source="stop.route.name", read_only=True)

    class Meta:
        model = StudentTransport
        fields = "__all__"
