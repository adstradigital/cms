from rest_framework.exceptions import PermissionDenied
from django.db.models import Q


class RolePermissionMixin:
    """
    Mixin that enforces:
    1. Codename-based RBAC  (has_perm_code)
    2. Row-Level Security    (contextual class/subject scoping)

    Scoping rules for non-superuser, non-admin teachers:
    - Class Teachers see ALL data in their assigned class's sections.
    - Subject Teachers see data ONLY in sections where they have a SubjectAllocation.
    - The union of both gives the teacher their full accessible scope.
    - Write operations (create/update/delete) are restricted to assigned-class sections only.
    """
    required_permission = None  # set this in each view, e.g. "students.view"

    def _is_admin_or_superuser(self, user):
        """Check if user is superuser or has a school-wide admin role."""
        if user.is_superuser:
            return True
        if user.role and user.role.scope == 'school':
            return True
        return False

    def get_queryset(self):
        """Scopes the queryset based on user's contextual access."""
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return qs.none()

        # Admins and superusers see everything in their school
        if self._is_admin_or_superuser(user):
            return qs

        # For class-scoped or subject-scoped roles, build a union filter
        accessible_section_ids = user.get_accessible_section_ids()

        if accessible_section_ids:
            # Try common filter patterns for different models
            # Models with a direct 'section' FK
            if hasattr(qs.model, 'section'):
                return qs.filter(section_id__in=accessible_section_ids)
            # Models with section through school_class (e.g. Student)
            if hasattr(qs.model, 'section'):
                return qs.filter(section_id__in=accessible_section_ids)
            # Fallback: use the old class filter
            class_filter = user.get_class_filter()
            if class_filter:
                return qs.filter(**class_filter)

        # If user has no class or allocation, show nothing
        return qs.none()

    def check_permissions(self, request):
        """Enforces codename-based RBAC permissions."""
        super().check_permissions(request)
        if self.required_permission:
            if not request.user.has_perm_code(self.required_permission):
                raise PermissionDenied('You do not have permission for this action.')

    def check_write_access(self, request, section=None):
        """
        Call this in create/update views to restrict writes.
        Class teachers can only write to their own assigned class's sections.
        Subject teachers can only write to sections where they are allocated.
        Returns True if write is allowed.
        """
        user = request.user

        if self._is_admin_or_superuser(user):
            return True

        if section is None:
            return False

        # Class teachers have full write access to their assigned class
        if user.is_class_teacher_of(section):
            return True

        # Subject teachers can write to sections they're allocated to
        allocated_ids = user.get_allocated_section_ids()
        if section.id in allocated_ids:
            return True

        return False
