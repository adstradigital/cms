from rest_framework import serializers
from .models import Role, Permission, PermissionChangeLog


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "codename", "label", "module", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(), many=True, required=False
    )

    class Meta:
        model = Role
        fields = ["id", "name", "is_custom", "scope", "permissions"]


class PermissionChangeLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    target_role_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    permission_label = serializers.SerializerMethodField()

    class Meta:
        model = PermissionChangeLog
        fields = [
            "id", "changed_by", "changed_by_name",
            "target_type", "target_role", "target_role_name",
            "target_user", "target_user_name",
            "permission", "permission_label",
            "action", "timestamp",
        ]

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() if obj.changed_by else "System"

    def get_target_role_name(self, obj):
        return obj.target_role.name if obj.target_role else None

    def get_target_user_name(self, obj):
        return obj.target_user.get_full_name() if obj.target_user else None

    def get_permission_label(self, obj):
        return obj.permission.label if obj.permission else None
