"""
Custom permission classes for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsStaff(BasePermission):
    """Allow access only to staff/teacher users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('admin', 'staff')


class IsStudent(BasePermission):
    """Allow access only to student users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'student'


class IsParent(BasePermission):
    """Allow access only to parent users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'parent'


class IsAdminOrStaff(BasePermission):
    """Allow access to admin or staff users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('admin', 'staff')
