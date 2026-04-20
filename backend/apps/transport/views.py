from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.students.models import Student
from .models import (
    BusLocationLog,
    RouteStop,
    SchoolBus,
    StudentTransport,
    TransportComplaint,
    TransportFee,
    TransportRoute,
)
from .serializers import (
    BusLocationLogSerializer,
    RouteStopSerializer,
    SchoolBusSerializer,
    StudentTransportSerializer,
    TransportComplaintSerializer,
    TransportFeePaySerializer,
    TransportFeeSerializer,
    TransportRouteSerializer,
)


def _derive_fee_status(amount_due, amount_paid, due_date, force_keep=False, current_status=None):
    if force_keep and current_status == "waived":
        return "waived"

    due = amount_due or Decimal("0")
    paid = amount_paid or Decimal("0")

    if paid >= due and due > Decimal("0"):
        return "paid"
    if paid > Decimal("0"):
        return "partial"
    if due_date and due_date < timezone.localdate():
        return "overdue"
    return "pending"


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def school_bus_list_view(request):
    try:
        if request.method == "GET":
            bus_status = request.query_params.get("status")
            is_active = request.query_params.get("is_active")

            qs = SchoolBus.objects.select_related("driver").all()
            if bus_status:
                qs = qs.filter(status=bus_status)
            if is_active is not None:
                qs = qs.filter(is_active=is_active.lower() == "true")

            return Response(SchoolBusSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = SchoolBusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def school_bus_detail_view(request, pk):
    try:
        try:
            bus = SchoolBus.objects.select_related("driver").get(pk=pk)
        except SchoolBus.DoesNotExist:
            return Response({"error": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(SchoolBusSerializer(bus).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = SchoolBusSerializer(bus, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        bus.is_active = False
        bus.status = "inactive"
        bus.save(update_fields=["is_active", "status", "updated_at"])
        return Response({"message": "Bus deactivated."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def school_bus_live_location_view(request, bus_pk):
    try:
        try:
            bus = SchoolBus.objects.select_related("driver").get(pk=bus_pk)
        except SchoolBus.DoesNotExist:
            return Response({"error": "Bus not found."}, status=status.HTTP_404_NOT_FOUND)

        latest_log = bus.location_logs.select_related("route", "recorded_by").first()
        return Response(
            {
                "bus": SchoolBusSerializer(bus).data,
                "live_location": BusLocationLogSerializer(latest_log).data if latest_log else None,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def bus_location_log_list_view(request):
    try:
        if request.method == "GET":
            bus_id = request.query_params.get("bus")
            route_id = request.query_params.get("route")
            only_latest = request.query_params.get("latest")

            qs = BusLocationLog.objects.select_related("bus", "route", "recorded_by").all()
            if bus_id:
                qs = qs.filter(bus_id=bus_id)
            if route_id:
                qs = qs.filter(route_id=route_id)

            if only_latest and only_latest.lower() == "true":
                latest = qs.first()
                return Response(
                    BusLocationLogSerializer(latest).data if latest else None,
                    status=status.HTTP_200_OK,
                )

            return Response(BusLocationLogSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = BusLocationLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        location = serializer.save(recorded_by=request.user)
        return Response(BusLocationLogSerializer(location).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transport_route_list_view(request):
    try:
        if request.method == "GET":
            qs = TransportRoute.objects.select_related("driver", "bus").prefetch_related("stops").filter(is_active=True)
            return Response(TransportRouteSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = TransportRouteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def transport_route_detail_view(request, pk):
    try:
        try:
            route = TransportRoute.objects.select_related("driver", "bus").prefetch_related("stops").get(pk=pk)
        except TransportRoute.DoesNotExist:
            return Response({"error": "Route not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(TransportRouteSerializer(route).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = TransportRouteSerializer(route, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        route.is_active = False
        route.save(update_fields=["is_active"])
        return Response({"message": "Route deactivated."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def route_stop_create_view(request, route_pk):
    try:
        if request.method == "GET":
            qs = RouteStop.objects.filter(route_id=route_pk).order_by("stop_order")
            return Response(RouteStopSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        data = {**request.data, "route": route_pk}
        serializer = RouteStopSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_transport_list_view(request):
    try:
        if request.method == "GET":
            route_id = request.query_params.get("route")
            student_id = request.query_params.get("student")

            qs = StudentTransport.objects.select_related(
                "student",
                "student__user",
                "stop",
                "stop__route",
                "stop__route__bus",
            ).filter(is_active=True)

            if route_id:
                qs = qs.filter(stop__route_id=route_id)
            if student_id:
                qs = qs.filter(student_id=student_id)
            return Response(StudentTransportSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = StudentTransportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transport_fee_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            route_id = request.query_params.get("route")
            pay_status = request.query_params.get("status")

            qs = TransportFee.objects.select_related(
                "student",
                "student__user",
                "route",
                "collected_by",
            ).all()

            if student_id:
                qs = qs.filter(student_id=student_id)
            if route_id:
                qs = qs.filter(route_id=route_id)
            if pay_status:
                qs = qs.filter(status=pay_status)

            return Response(TransportFeeSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = TransportFeeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fee = serializer.save(
            collected_by=request.user,
            status=_derive_fee_status(
                serializer.validated_data.get("amount_due"),
                serializer.validated_data.get("amount_paid"),
                serializer.validated_data.get("due_date"),
            ),
        )

        if fee.amount_paid > Decimal("0") and not fee.payment_date:
            fee.payment_date = timezone.localdate()
            fee.save(update_fields=["payment_date", "updated_at"])

        return Response(TransportFeeSerializer(fee).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def transport_fee_detail_view(request, pk):
    try:
        try:
            fee = TransportFee.objects.select_related(
                "student",
                "student__user",
                "route",
                "collected_by",
            ).get(pk=pk)
        except TransportFee.DoesNotExist:
            return Response({"error": "Transport fee record not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(TransportFeeSerializer(fee).data, status=status.HTTP_200_OK)

        serializer = TransportFeeSerializer(fee, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fee = serializer.save()
        fee.status = _derive_fee_status(
            fee.amount_due,
            fee.amount_paid,
            fee.due_date,
            force_keep=True,
            current_status=fee.status,
        )
        if fee.amount_paid > Decimal("0") and not fee.payment_date:
            fee.payment_date = timezone.localdate()
        fee.collected_by = request.user
        fee.save()

        return Response(TransportFeeSerializer(fee).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def transport_fee_pay_view(request, pk):
    try:
        try:
            fee = TransportFee.objects.get(pk=pk)
        except TransportFee.DoesNotExist:
            return Response({"error": "Transport fee record not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TransportFeePaySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = serializer.validated_data["amount"]
        if amount <= Decimal("0"):
            return Response({"error": "amount must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            fee.amount_paid = (fee.amount_paid or Decimal("0")) + amount
            if fee.amount_paid > fee.amount_due:
                fee.amount_paid = fee.amount_due
            fee.payment_method = serializer.validated_data["payment_method"]
            fee.payment_date = serializer.validated_data.get("payment_date", timezone.localdate())
            fee.transaction_id = serializer.validated_data.get("transaction_id", fee.transaction_id)
            remarks = serializer.validated_data.get("remarks")
            if remarks:
                fee.remarks = remarks
            fee.status = _derive_fee_status(
                fee.amount_due,
                fee.amount_paid,
                fee.due_date,
                force_keep=True,
                current_status=fee.status,
            )
            fee.collected_by = request.user
            fee.save()

        return Response(TransportFeeSerializer(fee).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transport_complaint_list_view(request):
    try:
        if request.method == "GET":
            complaint_status = request.query_params.get("status")
            priority = request.query_params.get("priority")
            student_id = request.query_params.get("student")
            route_id = request.query_params.get("route")
            bus_id = request.query_params.get("bus")
            mine = request.query_params.get("mine")

            qs = TransportComplaint.objects.select_related(
                "student",
                "student__user",
                "raised_by",
                "route",
                "bus",
                "resolved_by",
            ).all()

            if complaint_status:
                qs = qs.filter(status=complaint_status)
            if priority:
                qs = qs.filter(priority=priority)
            if student_id:
                qs = qs.filter(student_id=student_id)
            if route_id:
                qs = qs.filter(route_id=route_id)
            if bus_id:
                qs = qs.filter(bus_id=bus_id)
            if mine and mine.lower() == "true":
                qs = qs.filter(raised_by=request.user)

            return Response(TransportComplaintSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        data = request.data.copy()
        if not data.get("student"):
            profile = Student.objects.filter(user=request.user).first()
            if profile:
                data["student"] = profile.id

        serializer = TransportComplaintSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        complaint = serializer.save(raised_by=request.user)
        return Response(TransportComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def transport_complaint_detail_view(request, pk):
    try:
        try:
            complaint = TransportComplaint.objects.select_related(
                "student",
                "student__user",
                "raised_by",
                "route",
                "bus",
                "resolved_by",
            ).get(pk=pk)
        except TransportComplaint.DoesNotExist:
            return Response({"error": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(TransportComplaintSerializer(complaint).data, status=status.HTTP_200_OK)

        if request.method == "DELETE":
            complaint.delete()
            return Response({"message": "Complaint deleted."}, status=status.HTTP_204_NO_CONTENT)

        serializer = TransportComplaintSerializer(complaint, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        complaint = serializer.save()
        if complaint.status in ["resolved", "closed"] and not complaint.resolved_by_id:
            complaint.resolved_by = request.user
            complaint.save(update_fields=["resolved_by", "updated_at"])

        return Response(TransportComplaintSerializer(complaint).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
