from __future__ import annotations

from typing import Dict, Optional

from apps.academics.models import Subject, SubjectAllocation
from apps.accounts.models import AcademicYear
from apps.accounts.models import User
from apps.students.models import Class, Section


def get_class(class_id: int) -> Optional[Class]:
    return Class.objects.filter(id=class_id).first()


def get_section(section_id: int) -> Optional[Section]:
    return (
        Section.objects.select_related("school_class", "class_teacher")
        .filter(id=section_id)
        .first()
    )


def get_school_active_academic_year(school_id: int) -> Optional[AcademicYear]:
    return AcademicYear.objects.filter(school_id=school_id, is_active=True).first()


def get_subject_allocations(section: Section, academic_year: AcademicYear):
    return (
        SubjectAllocation.objects.filter(section=section, academic_year=academic_year)
        .select_related("subject")
        .prefetch_related("teachers")
    )


def get_class_subjects(school_class_id: int):
    return Subject.objects.filter(school_class_id=school_class_id)


def ensure_subject_allocations(section: Section, academic_year: AcademicYear) -> Dict:
    existing = SubjectAllocation.objects.filter(section=section, academic_year=academic_year)
    if existing.exists():
        return {"success": True, "created": 0}

    subjects = Subject.objects.filter(school_class=section.school_class)
    if not subjects.exists():
        return {
            "success": False,
            "error": "No subjects found for this class. Please create class subjects first.",
        }

    teachers = User.objects.filter(
        staff_profile__is_teaching_staff=True,
        is_active=True,
        school=section.school_class.school,
    ).distinct()
    if not teachers.exists():
        return {
            "success": False,
            "error": "No active teaching staff found to map subject allocations.",
        }

    teacher_list = list(teachers)
    created = 0
    for index, subject in enumerate(subjects):
        allocation, was_created = SubjectAllocation.objects.get_or_create(
            subject=subject,
            section=section,
            academic_year=academic_year,
        )
        if was_created:
            created += 1
        if allocation.teachers.count() == 0:
            allocation.teachers.add(teacher_list[index % len(teacher_list)])

    return {"success": True, "created": created}
