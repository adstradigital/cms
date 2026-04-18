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
        .select_related("subject", "teacher")
    )


def get_class_subjects(school_class_id: int):
    return Subject.objects.filter(school_class_id=school_class_id)


def ensure_subject_allocations(section: Section, academic_year: AcademicYear) -> Dict:
    existing = SubjectAllocation.objects.filter(section=section, academic_year=academic_year)
    subjects = Subject.objects.filter(school_class=section.school_class)
    if not subjects.exists():
        return {
            "success": False,
            "error": "No subjects found for this class. Please create class subjects first.",
        }

    all_teachers = User.objects.filter(
        staff_profile__is_teaching_staff=True,
        is_active=True,
        school=section.school_class.school,
    ).distinct()
    if not all_teachers.exists():
        return {
            "success": False,
            "error": "No active teaching staff found to map subject allocations.",
        }

    created = 0
    updated = 0
    missing_subject_teacher_mapping = []
    teacher_list = list(all_teachers)

    for index, subject in enumerate(subjects):
        allocation, was_created = SubjectAllocation.objects.get_or_create(
            subject=subject,
            section=section,
            academic_year=academic_year,
        )
        if was_created:
            created += 1

        if allocation.teacher:
            continue

        preferred_teachers = all_teachers.filter(
            staff_profile__teacher_detail__teaching_subjects=subject
        ).distinct()

        if preferred_teachers.exists():
            allocation.teacher = preferred_teachers.first()
            allocation.save()
            updated += 1
            continue

        # Controlled fallback so generation can still proceed while exposing gaps to admin.
        fallback_teacher = teacher_list[index % len(teacher_list)]
        allocation.teacher = fallback_teacher
        allocation.save()
        updated += 1
        missing_subject_teacher_mapping.append(
            {
                "subject_id": subject.id,
                "subject_name": subject.name,
                "fallback_teacher_id": fallback_teacher.id,
                "fallback_teacher_name": fallback_teacher.get_full_name(),
            }
        )

    return {
        "success": True,
        "created": created,
        "updated": updated,
        "missing_subject_teacher_mapping": missing_subject_teacher_mapping,
    }


def ensure_class_teacher_first_period_support(section: Section, academic_year: AcademicYear) -> Dict:
    """
    Ensures class teacher can be scheduled in first period by mapping them to at least one
    subject allocation in this section/year.
    """
    class_teacher_id = section.class_teacher_id
    if not class_teacher_id:
        return {
            "success": False,
            "error": "Class teacher is not assigned for this section.",
        }

    allocations = list(
        SubjectAllocation.objects.filter(section=section, academic_year=academic_year).select_related("teacher")
    )
    if not allocations:
        return {
            "success": False,
            "error": "No subject allocations available to map class teacher.",
        }

    for allocation in allocations:
        if allocation.teacher_id == class_teacher_id:
            return {"success": True, "already_mapped": True, "updated": False}

    # Fallback: add class teacher to the first allocation so generator can place first period.
    target = allocations[0]
    target.teacher_id = class_teacher_id
    target.save()
    return {
        "success": True,
        "already_mapped": False,
        "updated": True,
        "subject_id": target.subject_id,
        "subject_name": target.subject.name if getattr(target, "subject", None) else "",
    }
