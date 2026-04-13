from __future__ import annotations

from typing import Dict, Optional

from django.apps import apps
from django.db import connections

from apps.accounts.models import AcademicYear

from .access.classes import get_school_active_academic_year, get_section


def build_timetable_context(section_id: int, academic_year_id: Optional[int] = None) -> Dict:
    """
    Unified context builder for timetable-related AI requests.
    """
    section = get_section(section_id)
    if not section:
        return {"success": False, "error": "Section not found."}

    if academic_year_id:
        academic_year = AcademicYear.objects.filter(id=academic_year_id).first()
    else:
        academic_year = get_school_active_academic_year(section.school_class.school_id)

    if not academic_year:
        return {"success": False, "error": "Academic year not found."}

    return {
        "success": True,
        "section": section,
        "academic_year": academic_year,
    }


def get_database_inventory() -> Dict:
    """
    Exposes database aliases and all registered ORM models.
    Helps AI brain stay schema-aware as apps/tables grow.
    """
    aliases = list(connections.databases.keys())
    model_labels = sorted([model._meta.label for model in apps.get_models()])
    return {
        "db_aliases": aliases,
        "model_count": len(model_labels),
        "models": model_labels,
    }
