from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Role, Permission, PermissionChangeLog
from .serializers import RoleSerializer, PermissionSerializer, PermissionChangeLogSerializer

from django.contrib.auth import get_user_model
User = get_user_model()


def _log_permission_changes(changed_by, target_type, target_role=None, target_user=None,
                            old_perm_ids=None, new_perm_ids=None):
    """Create PermissionChangeLog entries for any added/removed permissions."""
    old_set = set(old_perm_ids or [])
    new_set = set(new_perm_ids or [])
    granted = new_set - old_set
    revoked = old_set - new_set
    logs = []
    for pid in granted:
        logs.append(PermissionChangeLog(
            changed_by=changed_by, target_type=target_type,
            target_role=target_role, target_user=target_user,
            permission_id=pid, action='granted',
        ))
    for pid in revoked:
        logs.append(PermissionChangeLog(
            changed_by=changed_by, target_type=target_type,
            target_role=target_role, target_user=target_user,
            permission_id=pid, action='revoked',
        ))
    if logs:
        PermissionChangeLog.objects.bulk_create(logs)


# ── Permissions list ────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def permission_list_view(request):
    qs = Permission.objects.all().order_by("module", "codename")
    return Response(PermissionSerializer(qs, many=True).data, status=status.HTTP_200_OK)


# ── Roles CRUD ──────────────────────────────────────────────────────
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
    # Log all initial permissions as granted
    perm_ids = list(role.permissions.values_list('id', flat=True))
    _log_permission_changes(request.user, 'role', target_role=role, new_perm_ids=perm_ids)
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
        old_perm_ids = list(role.permissions.values_list('id', flat=True))
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        new_perm_ids = list(role.permissions.values_list('id', flat=True))
        _log_permission_changes(request.user, 'role', target_role=role,
                                old_perm_ids=old_perm_ids, new_perm_ids=new_perm_ids)
        return Response(RoleSerializer(role).data, status=status.HTTP_200_OK)

    role.delete()
    return Response({"message": "Role deleted."}, status=status.HTTP_200_OK)


# ── Per-User individual permissions ────────────────────────────────
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_permissions_view(request, user_id):
    """Get or update individual permission overrides for a specific user."""
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        individual = list(target.individual_permissions.values_list('id', flat=True))
        role_perms = []
        role_name = None
        if target.role:
            role_perms = list(target.role.permissions.values_list('id', flat=True))
            role_name = target.role.name
        return Response({
            "user_id": target.id,
            "username": target.username,
            "full_name": target.get_full_name(),
            "role_name": role_name,
            "role_permissions": role_perms,
            "individual_permissions": individual,
        })

    # PATCH – update individual permissions
    new_ids = request.data.get("individual_permissions", [])
    old_ids = list(target.individual_permissions.values_list('id', flat=True))
    target.individual_permissions.set(new_ids)
    _log_permission_changes(request.user, 'user', target_user=target,
                            old_perm_ids=old_ids, new_perm_ids=new_ids)
    return Response({"message": "User permissions updated.", "individual_permissions": new_ids})


# ── Effective (merged) permissions for a user ──────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_effective_permissions_view(request, user_id):
    """Returns the union of role + individual permissions for a user."""
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    perm_ids = set(target.individual_permissions.values_list('id', flat=True))
    if target.role:
        perm_ids |= set(target.role.permissions.values_list('id', flat=True))
    perms = Permission.objects.filter(id__in=perm_ids).order_by('module', 'codename')
    return Response(PermissionSerializer(perms, many=True).data)


# ── Change log ─────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def permission_changelog_view(request):
    qs = PermissionChangeLog.objects.select_related(
        'changed_by', 'target_role', 'target_user', 'permission'
    ).all()
    # Optional filters
    role_id = request.query_params.get('role')
    user_id = request.query_params.get('user')
    if role_id:
        qs = qs.filter(target_role_id=role_id)
    if user_id:
        qs = qs.filter(target_user_id=user_id)
    qs = qs[:200]  # cap at 200 entries
    return Response(PermissionChangeLogSerializer(qs, many=True).data)


# ── Staff users list (for user permission picker) ──────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def staff_users_list_view(request):
    """Lightweight user list for the permission picker dropdown."""
    qs = User.objects.filter(portal='admin').order_by('first_name', 'last_name')
    search = request.query_params.get('search', '').strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(username__icontains=search)
        )
    data = [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.get_full_name(),
            "role_name": u.role.name if u.role else None,
        }
        for u in qs[:100]
    ]
    return Response(data)
