from rest_framework.exceptions import PermissionDenied

class RolePermissionMixin:
    required_permission = None  # set this in each view, e.g. "students.view"

    def get_queryset(self):
        """Scopes the queryset based on user's assigned class for RLS."""
        qs = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return qs.none()

        # Row Level Security: Class teachers only see their own class
        if user.assigned_class and not user.is_superuser:
            qs = qs.filter(**user.get_class_filter())

        return qs

    def check_permissions(self, request):
        """Enforces codename-based RBAC permissions."""
        super().check_permissions(request)
        if self.required_permission:
            if not request.user.has_perm_code(self.required_permission):
                raise PermissionDenied('You do not have permission for this action.')
