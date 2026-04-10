from __future__ import annotations

from django.db.models import Count, Q

from apps.attendance.models import Attendance


def get_student_attendance_summary(student_id: int):
    stats = Attendance.objects.filter(student_id=student_id).aggregate(
        total=Count("id"),
        present=Count("id", filter=Q(status="present")),
    )
    total = stats["total"] or 0
    present = stats["present"] or 0
    percentage = (present / total * 100.0) if total else 0.0
    return {
        "total": total,
        "present": present,
        "percentage": round(percentage, 2),
    }


def get_section_attendance_summary(section_id: int):
    return Attendance.objects.filter(student__section_id=section_id).values("student_id").annotate(
        total=Count("id"),
        present=Count("id", filter=Q(status="present")),
    )
