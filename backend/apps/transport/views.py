from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import TransportRoute, RouteStop, StudentTransport
from .serializers import TransportRouteSerializer, RouteStopSerializer, StudentTransportSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transport_route_list_view(request):
    try:
        if request.method == "GET":
            qs = TransportRoute.objects.select_related("driver").prefetch_related("stops").filter(is_active=True)
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
            route = TransportRoute.objects.select_related("driver").prefetch_related("stops").get(pk=pk)
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
        route.save()
        return Response({"message": "Route deactivated."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def route_stop_create_view(request, route_pk):
    try:
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
            qs = StudentTransport.objects.select_related(
                "student", "student__user", "stop", "stop__route"
            ).filter(is_active=True)
            if route_id:
                qs = qs.filter(stop__route_id=route_id)
            return Response(StudentTransportSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = StudentTransportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
