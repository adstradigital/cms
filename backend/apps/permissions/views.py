from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Role, Permission
from .serializers import RoleSerializer, PermissionSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def permission_list_view(request):
    qs = Permission.objects.all().order_by("codename")
    return Response(PermissionSerializer(qs, many=True).data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def role_list_view(request):
    if request.method == "GET":
        qs = Role.objects.prefetch_related("permissions").all().order_by("name")
        return Response(RoleSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    serializer = RoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    role = serializer.save()
    return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def role_detail_view(request, pk):
    try:
        role = Role.objects.prefetch_related("permissions").get(pk=pk)
    except Role.DoesNotExist:
        return Response({"error": "Role not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(RoleSerializer(role).data, status=status.HTTP_200_OK)

    if request.method == "PATCH":
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(RoleSerializer(role).data, status=status.HTTP_200_OK)

    role.delete()
    return Response({"message": "Role deleted."}, status=status.HTTP_200_OK)
