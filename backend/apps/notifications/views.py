from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def notification_list_view(request):
    try:
        if request.method == "GET":
            notif_type = request.query_params.get("type")
            audience = request.query_params.get("audience")
            section_id = request.query_params.get("section")
            class_id = request.query_params.get("class")
            published = request.query_params.get("published")
            qs = Notification.objects.select_related("created_by", "target_class", "target_section").all()
            if notif_type:
                qs = qs.filter(notification_type=notif_type)
            if audience:
                qs = qs.filter(target_audience=audience)
            if section_id:
                qs = qs.filter(target_section_id=section_id)
            if class_id:
                qs = qs.filter(target_class_id=class_id)
            if published in ["true", "false"]:
                qs = qs.filter(is_published=(published == "true"))
            return Response(
                NotificationSerializer(qs, many=True, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        serializer = NotificationSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        notification = serializer.save(created_by=request.user)
        return Response(
            NotificationSerializer(notification, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def notification_detail_view(request, pk):
    try:
        try:
            notification = Notification.objects.select_related("created_by", "target_class", "target_section").get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(
                NotificationSerializer(notification, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        if request.method == "PATCH":
            serializer = NotificationSerializer(
                notification, data=request.data, partial=True, context={"request": request}
            )
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        notification.delete()
        return Response({"message": "Notification deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notification_publish_view(request, pk):
    try:
        try:
            notification = Notification.objects.get(pk=pk)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.is_published = True
        notification.publish_at = timezone.now()
        notification.save()
        return Response({"message": "Notification published."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
