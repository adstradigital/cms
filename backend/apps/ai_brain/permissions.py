from __future__ import annotations

from typing import Optional, Tuple

from apps.students.models import Section


def has_ai_brain_access(user, *, section: Optional[Section] = None) -> Tuple[bool, str]:
    if not user or not user.is_authenticated:
        return False, "Authentication required."
    if user.is_superuser:
        return True, ""

    role_scope = getattr(getattr(user, "role", None), "scope", "")
    if role_scope == "school":
        return True, ""

    # Section-scoped access for class/subject roles.
    if section is not None:
        accessible_section_ids = set(user.get_accessible_section_ids())
        if section.id in accessible_section_ids:
            return True, ""
        return False, "You do not have access to this section."

    return False, "You do not have permission to run AI brain automation."
