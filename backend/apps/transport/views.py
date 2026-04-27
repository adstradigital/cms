from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Sum, Q, F
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
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
    StudentTransportLog,
    TransportComplaint,
    TransportFee,
    TransportFeePayment,
    TransportRoute,
)
from .serializers import (
    BusLocationLogSerializer,
    RouteStopSerializer,
    SchoolBusSerializer,
    StudentTransportSerializer,
    StudentTransportLogSerializer,
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
            mine = request.query_params.get("mine")

            qs = SchoolBus.objects.select_related("driver").all()
            if mine and mine.lower() == "true":
                qs = qs.filter(driver=request.user)
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bus_ping_view(request):
    """
    Endpoint for driver phone to automatically send location.
    Finds the bus assigned to the authenticated user (driver).
    """
    try:
        # Find bus assigned to this user
        bus = SchoolBus.objects.filter(driver=request.user).first()
        if not bus:
            return Response({"error": "No bus assigned to your account."}, status=status.HTTP_404_NOT_FOUND)

        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        speed = request.data.get("speed_kmph", 0)

        if latitude is None or longitude is None:
            return Response({"error": "Latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Log location
        log = BusLocationLog.objects.create(
            bus=bus,
            latitude=latitude,
            longitude=longitude,
            speed_kmph=speed,
            source="mobile",
            recorded_by=request.user
        )

        return Response(BusLocationLogSerializer(log).data, status=status.HTTP_201_CREATED)

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
                # Get the latest log ID for each bus
                from django.db.models import Max
                latest_log_ids = BusLocationLog.objects.values('bus').annotate(latest_id=Max('id')).values_list('latest_id', flat=True)
                qs = BusLocationLog.objects.filter(id__in=latest_log_ids).select_related("bus", "route", "recorded_by")
                
                return Response(
                    BusLocationLogSerializer(qs, many=True).data,
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


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def route_stop_detail_view(request, pk):
    try:
        try:
            stop = RouteStop.objects.get(pk=pk)
        except RouteStop.DoesNotExist:
            return Response({"error": "Stop not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            stop.delete()
            return Response({"message": "Stop deleted."}, status=status.HTTP_204_NO_CONTENT)

        serializer = RouteStopSerializer(stop, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(RouteStopSerializer(stop).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_transport_list_view(request):
    try:
        if request.method == "GET":
            route_id = request.query_params.get("route")
            student_id = request.query_params.get("student")
            search = request.query_params.get("search")

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
            if search:
                qs = qs.filter(
                    Q(student__user__first_name__icontains=search)
                    | Q(student__user__last_name__icontains=search)
                    | Q(student__admission_number__icontains=search)
                )
            return Response(StudentTransportSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        # Capacity validation before assignment
        data = request.data
        stop_id = data.get("stop")
        if stop_id:
            try:
                stop = RouteStop.objects.select_related("route", "route__bus").get(pk=stop_id)
                route = stop.route
                bus = route.bus
                if bus:
                    current_count = StudentTransport.objects.filter(
                        stop__route=route, is_active=True
                    ).count()
                    if current_count >= bus.capacity:
                        return Response(
                            {"error": f"Bus capacity ({bus.capacity}) reached for route '{route.name}'."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
            except RouteStop.DoesNotExist:
                return Response({"error": "Stop not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentTransportSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def student_transport_detail_view(request, pk):
    try:
        try:
            allocation = StudentTransport.objects.select_related(
                "student", "student__user", "stop", "stop__route", "stop__route__bus"
            ).get(pk=pk)
        except StudentTransport.DoesNotExist:
            return Response({"error": "Allocation not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(StudentTransportSerializer(allocation).data, status=status.HTTP_200_OK)

        if request.method == "DELETE":
            allocation.is_active = False
            allocation.save(update_fields=["is_active"])
            return Response({"message": "Allocation deactivated."}, status=status.HTTP_200_OK)

        serializer = StudentTransportSerializer(allocation, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(StudentTransportSerializer(allocation).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_transport_log_list_view(request):
    try:
        if request.method == "GET":
            date = request.query_params.get("date")
            route_id = request.query_params.get("route")
            student_id = request.query_params.get("student")

            qs = StudentTransportLog.objects.select_related(
                "student",
                "student__user",
                "route",
                "bus",
                "stop",
                "recorded_by",
            ).all()

            if date:
                qs = qs.filter(date=date)
            if route_id:
                qs = qs.filter(route_id=route_id)
            if student_id:
                qs = qs.filter(student_id=student_id)

            return Response(StudentTransportLogSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = StudentTransportLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        student = serializer.validated_data["student"]
        date = serializer.validated_data["date"]
        boarding_time = serializer.validated_data.get("boarding_time")
        exiting_time = serializer.validated_data.get("exiting_time")

        allocation = StudentTransport.objects.select_related(
            "stop",
            "stop__route",
            "stop__route__bus",
        ).filter(student=student, is_active=True).first()

        route = allocation.stop.route if allocation else None
        bus = route.bus if route else None
        stop = allocation.stop if allocation else None

        log, created = StudentTransportLog.objects.update_or_create(
            student=student,
            date=date,
            defaults={
                "route": route,
                "bus": bus,
                "stop": stop,
                "boarding_time": boarding_time,
                "exiting_time": exiting_time,
                "source": "manual",
                "recorded_by": request.user,
            },
        )

        payload = StudentTransportLogSerializer(log).data
        return Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def student_transport_log_detail_view(request, pk):
    try:
        try:
            log = StudentTransportLog.objects.select_related(
                "student",
                "student__user",
                "route",
                "bus",
                "stop",
                "recorded_by",
            ).get(pk=pk)
        except StudentTransportLog.DoesNotExist:
            return Response({"error": "Log not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            log.delete()
            return Response({"message": "Log deleted."}, status=status.HTTP_204_NO_CONTENT)

        data = request.data or {}

        if "boarding_time" in data:
            raw = data.get("boarding_time")
            log.boarding_time = None if raw in (None, "") else parse_time(str(raw))
            if raw not in (None, "") and log.boarding_time is None:
                return Response({"error": "Invalid boarding_time."}, status=status.HTTP_400_BAD_REQUEST)

        if "exiting_time" in data:
            raw = data.get("exiting_time")
            log.exiting_time = None if raw in (None, "") else parse_time(str(raw))
            if raw not in (None, "") and log.exiting_time is None:
                return Response({"error": "Invalid exiting_time."}, status=status.HTTP_400_BAD_REQUEST)

        allocation = StudentTransport.objects.select_related(
            "stop",
            "stop__route",
            "stop__route__bus",
        ).filter(student=log.student, is_active=True).first()

        route = allocation.stop.route if allocation else None
        bus = route.bus if route else None
        stop = allocation.stop if allocation else None

        log.route = route
        log.bus = bus
        log.stop = stop
        log.recorded_by = request.user
        log.source = "manual"
        log.save()

        return Response(StudentTransportLogSerializer(log).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def student_transport_log_bulk_upsert_view(request):
    """
    Bulk upsert student boarding/exiting times for a date (optionally scoped to a route).
    Body:
      { "date": "YYYY-MM-DD", "route": <id?>, "items": [{"student": <id>, "boarding_time": "HH:MM", "exiting_time": "HH:MM"}] }
    """
    try:
        date = parse_date(str(request.data.get("date") or ""))
        if not date:
            return Response({"error": "date is required (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        route_id = request.data.get("route")
        items = request.data.get("items", [])
        if not isinstance(items, list):
            return Response({"error": "items must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        normalized = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            student_id = item.get("student")
            if not student_id:
                continue
            normalized[int(student_id)] = {
                "boarding_time": item.get("boarding_time"),
                "exiting_time": item.get("exiting_time"),
            }

        student_ids = list(normalized.keys())
        if not student_ids:
            return Response({"results": [], "created": 0, "updated": 0}, status=status.HTTP_200_OK)

        allocation_qs = StudentTransport.objects.select_related(
            "stop",
            "stop__route",
            "stop__route__bus",
        ).filter(student_id__in=student_ids, is_active=True)
        if route_id:
            allocation_qs = allocation_qs.filter(stop__route_id=route_id)
        allocations = list(allocation_qs)
        alloc_by_student = {a.student_id: a for a in allocations}

        existing_logs = list(StudentTransportLog.objects.filter(date=date, student_id__in=student_ids))
        existing_by_student = {log.student_id: log for log in existing_logs}

        now = timezone.now()
        to_create = []
        to_update = []
        created_count = 0
        updated_count = 0

        for student_id, values in normalized.items():
            allocation = alloc_by_student.get(student_id)
            route = allocation.stop.route if allocation else None
            bus = route.bus if route else None
            stop = allocation.stop if allocation else None

            raw_board = values.get("boarding_time")
            raw_exit = values.get("exiting_time")

            boarding_time = None if raw_board in (None, "") else parse_time(str(raw_board))
            if raw_board not in (None, "") and boarding_time is None:
                return Response({"error": f"Invalid boarding_time for student {student_id}."}, status=status.HTTP_400_BAD_REQUEST)

            exiting_time = None if raw_exit in (None, "") else parse_time(str(raw_exit))
            if raw_exit not in (None, "") and exiting_time is None:
                return Response({"error": f"Invalid exiting_time for student {student_id}."}, status=status.HTTP_400_BAD_REQUEST)

            log = existing_by_student.get(student_id)
            if log:
                log.route = route
                log.bus = bus
                log.stop = stop
                log.boarding_time = boarding_time
                log.exiting_time = exiting_time
                log.source = "manual"
                log.recorded_by = request.user
                log.updated_at = now
                to_update.append(log)
            else:
                if boarding_time is None and exiting_time is None:
                    continue
                to_create.append(
                    StudentTransportLog(
                        student_id=student_id,
                        date=date,
                        route=route,
                        bus=bus,
                        stop=stop,
                        boarding_time=boarding_time,
                        exiting_time=exiting_time,
                        source="manual",
                        recorded_by=request.user,
                        created_at=now,
                        updated_at=now,
                    )
                )

        with transaction.atomic():
            if to_create:
                StudentTransportLog.objects.bulk_create(to_create)
                created_count = len(to_create)

            if to_update:
                StudentTransportLog.objects.bulk_update(
                    to_update,
                    ["route", "bus", "stop", "boarding_time", "exiting_time", "source", "recorded_by", "updated_at"],
                )
                updated_count = len(to_update)

        result_qs = StudentTransportLog.objects.select_related(
            "student",
            "student__user",
            "route",
            "bus",
            "stop",
            "recorded_by",
        ).filter(date=date, student_id__in=student_ids)
        if route_id:
            result_qs = result_qs.filter(route_id=route_id)

        return Response(
            {
                "results": StudentTransportLogSerializer(result_qs, many=True).data,
                "created": created_count,
                "updated": updated_count,
            },
            status=status.HTTP_200_OK,
        )

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
            # Create installment record
            TransportFeePayment.objects.create(
                fee=fee,
                amount=amount,
                payment_date=serializer.validated_data.get("payment_date", timezone.localdate()),
                payment_method=serializer.validated_data["payment_method"],
                transaction_id=serializer.validated_data.get("transaction_id", ""),
                remarks=serializer.validated_data.get("remarks", ""),
                collected_by=request.user
            )

            # Update master record
            fee.amount_paid = (fee.amount_paid or Decimal("0")) + amount
            if fee.amount_paid > fee.amount_due:
                # Optional: Allow overpayment or cap it
                pass
            
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transport_analytics_view(request):
    """Aggregate analytics for the transport dashboard."""
    try:
        today = timezone.localdate()

        # Fleet stats
        total_buses = SchoolBus.objects.count()
        active_buses = SchoolBus.objects.filter(is_active=True, status="active").count()
        maintenance_buses = SchoolBus.objects.filter(status="maintenance").count()

        # Route stats
        total_routes = TransportRoute.objects.filter(is_active=True).count()

        # Student stats
        total_students = StudentTransport.objects.filter(is_active=True).count()

        # Occupancy per route
        route_occupancy = []
        for route in TransportRoute.objects.filter(is_active=True).select_related("bus"):
            enrolled = StudentTransport.objects.filter(stop__route=route, is_active=True).count()
            capacity = route.bus.capacity if route.bus else route.vehicle_capacity or 40
            route_occupancy.append({
                "route": route.name,
                "enrolled": enrolled,
                "capacity": capacity,
                "occupancy_pct": round((enrolled / capacity) * 100, 1) if capacity else 0,
            })

        # Fee stats
        fee_qs = TransportFee.objects.all()
        total_due = fee_qs.aggregate(total=Sum("amount_due"))["total"] or Decimal("0")
        total_collected = fee_qs.aggregate(total=Sum("amount_paid"))["total"] or Decimal("0")
        fee_by_status = dict(fee_qs.values_list("status").annotate(cnt=Count("id")).values_list("status", "cnt"))
        collection_rate = round((total_collected / total_due) * 100, 1) if total_due else 0

        # Complaint stats
        complaint_qs = TransportComplaint.objects.all()
        complaint_by_status = dict(
            complaint_qs.values_list("status").annotate(cnt=Count("id")).values_list("status", "cnt")
        )
        complaint_by_priority = dict(
            complaint_qs.values_list("priority").annotate(cnt=Count("id")).values_list("priority", "cnt")
        )

        return Response({
            "fleet": {
                "total": total_buses,
                "active": active_buses,
                "maintenance": maintenance_buses,
                "inactive": total_buses - active_buses - maintenance_buses,
            },
            "routes": {"total": total_routes},
            "students": {"total": total_students},
            "occupancy": route_occupancy,
            "fees": {
                "total_due": float(total_due),
                "total_collected": float(total_collected),
                "outstanding": float(total_due - total_collected),
                "collection_rate": collection_rate,
                "by_status": fee_by_status,
            },
            "complaints": {
                "total": complaint_qs.count(),
                "by_status": complaint_by_status,
                "by_priority": complaint_by_priority,
            },
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
