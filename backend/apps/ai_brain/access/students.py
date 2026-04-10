from __future__ import annotations

from typing import Optional

from apps.students.models import Student


def get_student(student_id: int) -> Optional[Student]:
    return (
        Student.objects.select_related("user", "section", "section__school_class")
        .filter(id=student_id)
        .first()
    )


def get_students_by_section(section_id: int):
    return Student.objects.select_related("user").filter(section_id=section_id, is_active=True)
