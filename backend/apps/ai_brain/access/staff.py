from __future__ import annotations

from apps.accounts.models import User


def get_teaching_staff():
    return User.objects.filter(staff_profile__is_teaching_staff=True, is_active=True).distinct()


def get_teacher(teacher_id: int):
    return User.objects.filter(id=teacher_id).first()
