from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Set

from django.db.models import Count

from apps.accounts.models import AcademicYear, User
from apps.students.models import Section

from ..access.classes import get_subject_allocations
from ..access.timetable import (
    get_periods_for_section,
    get_section_timetables,
    get_teacher_existing_commitments,
)


DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6]
DEFAULT_PERIODS_PER_DAY = 8
DEFAULT_BREAK_PERIODS = [4]


@dataclass
class AllocationNeed:
    subject_id: int
    subject_name: str
    weekly_periods: int
    teacher_ids: List[int]


class TimetableConstraintValidator:
    def __init__(self, section: Section, academic_year: AcademicYear):
        self.section = section
        self.academic_year = academic_year

    def validate_existing(
        self,
        periods_per_day: int = DEFAULT_PERIODS_PER_DAY,
        break_periods: Optional[List[int]] = None,
        working_days: Optional[List[int]] = None,
    ) -> Dict:
        from apps.academics.models import Period

        break_periods = sorted(set(break_periods or DEFAULT_BREAK_PERIODS))
        working_days = sorted(set(working_days or DEFAULT_WORKING_DAYS))
        issues = []

        day_timetables = get_section_timetables(self.section, self.academic_year, working_days)
        for timetable in day_timetables:
            periods = list(timetable.periods.all())
            period_numbers = sorted([period.period_number for period in periods])

            if period_numbers and max(period_numbers) > periods_per_day:
                issues.append(
                    {
                        "type": "period_overflow",
                        "severity": "error",
                        "day": timetable.day_of_week,
                        "message": f"Day {timetable.day_of_week} has periods beyond {periods_per_day}.",
                    }
                )

            for break_slot in break_periods:
                slot = next((period for period in periods if period.period_number == break_slot), None)
                if slot and slot.period_type not in {"break", "lunch"}:
                    issues.append(
                        {
                            "type": "break_mismatch",
                            "severity": "error",
                            "day": timetable.day_of_week,
                            "period": break_slot,
                            "message": "Configured break slot is not marked as break/lunch.",
                        }
                    )

            for period in periods:
                if period.period_type != "class":
                    continue
                if not period.subject_id:
                    issues.append(
                        {
                            "type": "missing_subject",
                            "severity": "error",
                            "day": timetable.day_of_week,
                            "period": period.period_number,
                            "message": "Class period has no subject.",
                        }
                    )
                if not period.teacher_id:
                    issues.append(
                        {
                            "type": "missing_teacher",
                            "severity": "error",
                            "day": timetable.day_of_week,
                            "period": period.period_number,
                            "message": "Class period has no teacher.",
                        }
                    )

        teacher_clashes = (
            Period.objects.filter(
                timetable__academic_year=self.academic_year,
                timetable__day_of_week__in=working_days,
                teacher__isnull=False,
            )
            .values("teacher_id", "timetable__day_of_week", "period_number")
            .annotate(slot_count=Count("id"))
            .filter(slot_count__gt=1)
        )
        for clash in teacher_clashes:
            issues.append(
                {
                    "type": "teacher_clash",
                    "severity": "error",
                    "day": clash["timetable__day_of_week"],
                    "period": clash["period_number"],
                    "teacher_id": clash["teacher_id"],
                    "message": "Teacher assigned to multiple sections at same day/period.",
                }
            )

        allocation_map = self._build_allocation_map()
        target_periods = get_periods_for_section(self.section, self.academic_year, working_days)
        for period in target_periods:
            subject_id = period.subject_id
            allowed_teachers = allocation_map.get(subject_id, set())
            if subject_id not in allocation_map:
                issues.append(
                    {
                        "type": "subject_not_allocated",
                        "severity": "error",
                        "day": period.timetable.day_of_week,
                        "period": period.period_number,
                        "subject_id": subject_id,
                        "message": "Subject is not allocated to this section in current academic year.",
                    }
                )
                continue
            if period.teacher_id and period.teacher_id not in allowed_teachers:
                issues.append(
                    {
                        "type": "teacher_not_mapped",
                        "severity": "error",
                        "day": period.timetable.day_of_week,
                        "period": period.period_number,
                        "teacher_id": period.teacher_id,
                        "subject_id": subject_id,
                        "message": "Teacher is not mapped to this subject allocation.",
                    }
                )

        return {
            "valid": not any(issue["severity"] == "error" for issue in issues),
            "issues": issues,
            "summary": {
                "errors": sum(1 for issue in issues if issue["severity"] == "error"),
                "warnings": sum(1 for issue in issues if issue["severity"] == "warning"),
            },
        }

    def _build_allocation_map(self) -> Dict[int, Set[int]]:
        allocation_map: Dict[int, Set[int]] = {}
        allocations = get_subject_allocations(self.section, self.academic_year)
        for allocation in allocations:
            allocation_map[allocation.subject_id] = set(allocation.teachers.values_list("id", flat=True))
        return allocation_map


class TimetableDraftGenerator:
    def __init__(self, section: Section, academic_year: AcademicYear, config: Dict):
        self.section = section
        self.academic_year = academic_year

        self.working_days = sorted(set(config.get("working_days") or DEFAULT_WORKING_DAYS))
        self.periods_per_day = int(config.get("periods_per_day") or DEFAULT_PERIODS_PER_DAY)
        self.break_periods = sorted(set(config.get("break_periods") or DEFAULT_BREAK_PERIODS))

        preferences = config.get("preferences") or {}
        self.class_teacher_first_period = bool(preferences.get("class_teacher_first_period", False))
        self.max_consecutive_periods_teacher = int(preferences.get("max_consecutive_periods_teacher", 4))
        self.min_teacher_free_periods_per_day = int(preferences.get("min_teacher_free_periods_per_day", 1))
        self.allow_same_subject_twice_day = bool(preferences.get("allow_same_subject_twice_day", False))

        self._teacher_day_periods: Dict[int, Dict[int, Set[int]]] = defaultdict(lambda: defaultdict(set))
        self._teacher_day_load: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))

    def generate(self) -> Dict:
        allocations = self._get_allocation_needs()
        if not allocations:
            return {"success": False, "error": "No subject allocations found for this section."}

        teacher_ids = sorted({teacher_id for need in allocations for teacher_id in need.teacher_ids})
        if not teacher_ids:
            return {
                "success": False,
                "error": "No teachers mapped in subject allocations. Map teachers before generating timetable.",
            }

        self._seed_teacher_busy_state(teacher_ids)

        total_required = sum(need.weekly_periods for need in allocations)
        total_slots = len(self.working_days) * (
            self.periods_per_day - len([period for period in self.break_periods if period <= self.periods_per_day])
        )
        if total_required > total_slots:
            return {
                "success": False,
                "error": "Subject weekly periods exceed available teaching slots.",
                "details": {
                    "required_subject_periods": total_required,
                    "available_teaching_slots": total_slots,
                },
            }

        remaining = {need.subject_id: need.weekly_periods for need in allocations}
        need_map = {need.subject_id: need for need in allocations}
        daily_subject_count = {day: Counter() for day in self.working_days}
        draft = {day: {} for day in self.working_days}
        unplaced = []

        self._assign_class_teacher_first_period(draft, daily_subject_count, remaining, need_map)

        for day in self.working_days:
            for period in range(1, self.periods_per_day + 1):
                if period in self.break_periods:
                    draft[day][period] = {"type": "break"}
                    continue
                if period in draft[day]:
                    continue

                candidate_subjects = [subject_id for subject_id, count in remaining.items() if count > 0]
                candidate_subjects.sort(key=lambda subject_id: remaining[subject_id], reverse=True)

                placed = False
                for subject_id in candidate_subjects:
                    if not self.allow_same_subject_twice_day and daily_subject_count[day][subject_id] >= 1:
                        continue

                    need = need_map[subject_id]
                    teacher_id = self._pick_teacher_for_slot(need.teacher_ids, day, period)
                    if not teacher_id:
                        continue

                    draft[day][period] = {
                        "type": "class",
                        "subject_id": need.subject_id,
                        "subject_name": need.subject_name,
                        "teacher_id": teacher_id,
                        "teacher_name": self._teacher_name(teacher_id),
                    }
                    remaining[subject_id] -= 1
                    daily_subject_count[day][subject_id] += 1
                    self._teacher_day_periods[teacher_id][day].add(period)
                    self._teacher_day_load[teacher_id][day] += 1
                    placed = True
                    break

                if not placed:
                    draft[day][period] = {"type": "free"}

        for subject_id, count in remaining.items():
            if count > 0:
                unplaced.append(
                    {
                        "subject_id": subject_id,
                        "subject_name": need_map[subject_id].subject_name,
                        "remaining_periods": count,
                    }
                )

        return {
            "success": len(unplaced) == 0,
            "draft": self._serialize_draft(draft),
            "meta": {
                "working_days": self.working_days,
                "periods_per_day": self.periods_per_day,
                "break_periods": self.break_periods,
                "unplaced": unplaced,
                "hard_constraints_applied": [
                    "teacher_no_double_booking",
                    "subject_teacher_mapping",
                    "fixed_break_slots",
                    "weekly_subject_quota_target",
                    "class_teacher_first_period(optional)",
                    "teacher_max_consecutive_periods",
                    "teacher_min_free_periods_per_day",
                ],
            },
        }

    def _get_allocation_needs(self) -> List[AllocationNeed]:
        allocations = get_subject_allocations(self.section, self.academic_year)
        needs: List[AllocationNeed] = []
        for allocation in allocations:
            teacher_ids = list(allocation.teachers.values_list("id", flat=True))
            if not teacher_ids:
                continue
            weekly_periods = int(allocation.subject.weekly_periods or 0)
            if weekly_periods <= 0:
                continue
            needs.append(
                AllocationNeed(
                    subject_id=allocation.subject_id,
                    subject_name=allocation.subject.name,
                    weekly_periods=weekly_periods,
                    teacher_ids=teacher_ids,
                )
            )
        return needs

    def _seed_teacher_busy_state(self, teacher_ids: List[int]) -> None:
        teacher_day_periods = get_teacher_existing_commitments(
            teacher_ids=teacher_ids,
            academic_year=self.academic_year,
            working_days=self.working_days,
            exclude_section_id=self.section.id,
        )
        for teacher_id, day_periods in teacher_day_periods.items():
            for day, periods in day_periods.items():
                self._teacher_day_periods[teacher_id][day].update(periods)
                self._teacher_day_load[teacher_id][day] += len(periods)

    def _assign_class_teacher_first_period(self, draft, daily_subject_count, remaining, need_map) -> None:
        if not self.class_teacher_first_period or not self.section.class_teacher_id:
            return

        class_teacher_id = self.section.class_teacher_id
        class_teacher_subjects = [
            subject_id
            for subject_id, need in need_map.items()
            if class_teacher_id in need.teacher_ids and remaining.get(subject_id, 0) > 0
        ]
        if not class_teacher_subjects:
            return
        class_teacher_subjects.sort(key=lambda subject_id: remaining[subject_id], reverse=True)

        for day in self.working_days:
            first_period = 1
            if first_period in self.break_periods:
                continue
            if self._teacher_busy(class_teacher_id, day, first_period):
                continue

            subject_id = class_teacher_subjects[0]
            draft[day][first_period] = {
                "type": "class",
                "subject_id": subject_id,
                "subject_name": need_map[subject_id].subject_name,
                "teacher_id": class_teacher_id,
                "teacher_name": self._teacher_name(class_teacher_id),
            }
            remaining[subject_id] -= 1
            daily_subject_count[day][subject_id] += 1
            self._teacher_day_periods[class_teacher_id][day].add(first_period)
            self._teacher_day_load[class_teacher_id][day] += 1

            if remaining[subject_id] <= 0:
                class_teacher_subjects = [
                    sid for sid in class_teacher_subjects if remaining.get(sid, 0) > 0
                ]
                if not class_teacher_subjects:
                    break

    def _pick_teacher_for_slot(self, teacher_ids: List[int], day: int, period: int) -> Optional[int]:
        valid = []
        for teacher_id in teacher_ids:
            if self._teacher_busy(teacher_id, day, period):
                continue
            if not self._teacher_free_quota_possible(teacher_id, day):
                continue
            if self._would_violate_consecutive_limit(teacher_id, day, period):
                continue
            valid.append(teacher_id)
        if not valid:
            return None
        valid.sort(key=lambda teacher_id: self._teacher_day_load[teacher_id][day])
        return valid[0]

    def _teacher_busy(self, teacher_id: int, day: int, period: int) -> bool:
        return period in self._teacher_day_periods[teacher_id][day]

    def _teacher_free_quota_possible(self, teacher_id: int, day: int) -> bool:
        teaching_slots_per_day = self.periods_per_day - len(
            [period for period in self.break_periods if period <= self.periods_per_day]
        )
        max_allowed = max(0, teaching_slots_per_day - self.min_teacher_free_periods_per_day)
        return self._teacher_day_load[teacher_id][day] < max_allowed

    def _would_violate_consecutive_limit(self, teacher_id: int, day: int, period: int) -> bool:
        existing = self._teacher_day_periods[teacher_id][day]
        if not existing:
            return False

        chain = {period}
        left = period - 1
        while left in existing:
            chain.add(left)
            left -= 1
        right = period + 1
        while right in existing:
            chain.add(right)
            right += 1
        return len(chain) > self.max_consecutive_periods_teacher

    @staticmethod
    def _teacher_name(teacher_id: int) -> str:
        user = User.objects.filter(id=teacher_id).only("first_name", "last_name").first()
        return user.get_full_name() if user else ""

    @staticmethod
    def _serialize_draft(draft: Dict[int, Dict[int, Dict]]) -> List[Dict]:
        output = []
        for day in sorted(draft.keys()):
            periods = []
            for period_number in sorted(draft[day].keys()):
                periods.append({"period_number": period_number, **draft[day][period_number]})
            output.append({"day_of_week": day, "periods": periods})
        return output
