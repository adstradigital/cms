from __future__ import annotations

from typing import Dict


def ensure_physical_education_subject_for_class(*, school_class) -> Dict:
    """
    Ensures every class has a Physical Education / PT subject instance.
    Returns metadata about what happened.
    """
    from .models import Subject

    created = False
    updated = False

    subject, was_created = Subject.objects.get_or_create(
        school_class=school_class,
        code="PT",
        defaults={
            "school": getattr(school_class, "school", None),
            "name": "Physical Education",
            "description": "Physical Training / Physical Education",
            "weekly_periods": 2,
            "color_code": "#22c55e",
            "term_type": "annual",
            "is_active": True,
            "is_compulsory": True,
        },
    )
    if was_created:
        created = True
    else:
        changed_fields = []
        if not subject.is_compulsory:
            subject.is_compulsory = True
            changed_fields.append("is_compulsory")
        if subject.school_id is None and getattr(school_class, "school_id", None):
            subject.school_id = school_class.school_id
            changed_fields.append("school")
        if changed_fields:
            subject.save(update_fields=changed_fields)
            updated = True

    return {"success": True, "created": created, "updated": updated, "subject_id": subject.id}

