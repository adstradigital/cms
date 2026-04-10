from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional, Set

from apps.academics.models import Period, Timetable
from apps.accounts.models import AcademicYear
from apps.students.models import Section


def get_section_timetables(section: Section, academic_year: AcademicYear, working_days: List[int]):
    return Timetable.objects.filter(
        section=section,
        academic_year=academic_year,
        day_of_week__in=working_days,
    ).prefetch_related("periods")


def get_teacher_slot_conflicts(academic_year: AcademicYear, working_days: List[int]):
    return (
        Period.objects.filter(
            timetable__academic_year=academic_year,
            timetable__day_of_week__in=working_days,
            teacher__isnull=False,
        )
        .values("teacher_id", "timetable__day_of_week", "period_number")
    )


def get_periods_for_section(section: Section, academic_year: AcademicYear, working_days: List[int]):
    return Period.objects.filter(
        timetable__section=section,
        timetable__academic_year=academic_year,
        timetable__day_of_week__in=working_days,
        period_type="class",
    )


def get_teacher_existing_commitments(
    teacher_ids: List[int],
    academic_year: AcademicYear,
    working_days: List[int],
    exclude_section_id: Optional[int] = None,
) -> Dict[int, Dict[int, Set[int]]]:
    teacher_day_periods: Dict[int, Dict[int, Set[int]]] = defaultdict(lambda: defaultdict(set))
    queryset = Period.objects.filter(
        timetable__academic_year=academic_year,
        timetable__day_of_week__in=working_days,
        teacher_id__in=teacher_ids,
        period_type="class",
    )
    if exclude_section_id:
        queryset = queryset.exclude(timetable__section_id=exclude_section_id)

    for period in queryset:
        teacher_day_periods[period.teacher_id][period.timetable.day_of_week].add(period.period_number)
    return teacher_day_periods
