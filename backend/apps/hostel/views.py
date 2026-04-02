from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import HostelBlock, HostelRoom, HostelAllotment
from .serializers import HostelBlockSerializer, HostelRoomSerializer, HostelAllotmentSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hostel_block_list_view(request):
    try:
        if request.method == "GET":
            qs = HostelBlock.objects.select_related("warden").all()
            return Response(HostelBlockSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = HostelBlockSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hostel_room_list_view(request):
    try:
        if request.method == "GET":
            block_id = request.query_params.get("block")
            qs = HostelRoom.objects.select_related("block").all()
            if block_id:
                qs = qs.filter(block_id=block_id)
            return Response(HostelRoomSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = HostelRoomSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hostel_allotment_list_view(request):
    try:
        if request.method == "GET":
            block_id = request.query_params.get("block")
            qs = HostelAllotment.objects.select_related(
                "student", "student__user", "room", "room__block"
            ).filter(is_active=True)
            if block_id:
                qs = qs.filter(room__block_id=block_id)
            return Response(HostelAllotmentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = HostelAllotmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        room_id = request.data.get("room")
        try:
            room = HostelRoom.objects.get(pk=room_id)
        except HostelRoom.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        if room.occupied >= room.capacity:
            return Response({"error": "Room is at full capacity."}, status=status.HTTP_400_BAD_REQUEST)

        allotment = serializer.save()
        room.occupied += 1
        room.save()
        return Response(HostelAllotmentSerializer(allotment).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hostel_vacate_view(request, pk):
    """Vacate a hostel allotment."""
    try:
        try:
            allotment = HostelAllotment.objects.select_related("room").get(pk=pk)
        except HostelAllotment.DoesNotExist:
            return Response({"error": "Allotment not found."}, status=status.HTTP_404_NOT_FOUND)

        allotment.is_active = False
        allotment.leave_date = timezone.now().date()
        allotment.save()

        room = allotment.room
        room.occupied = max(0, room.occupied - 1)
        room.save()

        return Response({"message": "Student vacated successfully."}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
