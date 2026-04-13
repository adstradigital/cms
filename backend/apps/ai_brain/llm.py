from __future__ import annotations

from typing import Dict


DEFAULT_BRAIN_POLICY = {
    "mode": "system_brain",
    "external_llm_enabled": False,
    "preview_required_before_apply": True,
    "manual_override_allowed": True,
    "enforce_permission_scope": True,
    "hard_constraints": [
        "teacher_no_double_booking",
        "class_single_period_per_slot",
        "fixed_break_slots",
        "subject_teacher_mapping",
        "section_allocation_enforcement",
    ],
    "soft_constraints": [
        "class_teacher_first_period_optional",
        "teacher_min_free_periods",
        "teacher_max_consecutive_periods",
        "subject_distribution_balance",
    ],
}


def get_brain_policy() -> Dict:
    """
    Returns the active policy for the in-house constraint engine.
    """
    return DEFAULT_BRAIN_POLICY.copy()


def merge_constraint_preferences(preferences: Dict | None) -> Dict:
    """
    Normalizes UI-sent preferences for deterministic engine behavior.
    """
    prefs = preferences or {}
    return {
        "class_teacher_first_period": bool(prefs.get("class_teacher_first_period", False)),
        "min_teacher_free_periods_per_day": int(prefs.get("min_teacher_free_periods_per_day", 1)),
        "max_consecutive_periods_teacher": int(prefs.get("max_consecutive_periods_teacher", 4)),
        "allow_same_subject_twice_day": bool(prefs.get("allow_same_subject_twice_day", False)),
    }
