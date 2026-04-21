from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Any
import copy

from django.db.models import Count

from apps.accounts.models import AcademicYear, User
from apps.students.models import Section

from ..access.classes import get_subject_allocations
from ..access.timetable import (
    get_periods_for_section,
    get_section_timetables,
    get_teacher_existing_commitments,
)


DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]
DEFAULT_PERIODS_PER_DAY = 10
DEFAULT_BREAK_PERIODS = [4]


@dataclass
class AllocationNeed:
    subject_id: int
    subject_name: str
    weekly_periods: int
    teacher_ids: List[int]
    is_consecutive_required: bool = False  # E.g. Lab subjects


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
            allocation_map[allocation.subject_id] = {allocation.teacher_id} if allocation.teacher_id else set()
        return allocation_map


class TimetableDraftGenerator:
    """
    Upgraded AI Logic Engine using Constraint Satisfaction (CSP) and local Backtracking.
    Completely avoids external LLMs, using heuristics to handle deadlocks.
    """
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
        
        # New Feature: Enforce lab subjects consecutive blocks if mentioned in preferences
        self.enforce_consecutive_labs = bool(preferences.get("enforce_consecutive_labs", True))

        self._teacher_day_periods: Dict[int, Dict[int, Set[int]]] = defaultdict(lambda: defaultdict(set))
        self._teacher_day_load: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self._teacher_cache: Dict[int, str] = {}
        self._initial_draft = config.get("initial_draft") or []

    def generate(self) -> Dict:
        allocations = self._get_allocation_needs()
        if not allocations:
            return {"success": False, "error": "No subject allocations found for this section."}

        teacher_ids = sorted({teacher_id for need in allocations for teacher_id in need.teacher_ids})
        if not teacher_ids:
            return {"success": False, "error": "No teachers mapped in subject allocations."}

        # Check for missing class teacher if the rule is enabled
        if self.class_teacher_first_period and not self.section.class_teacher_id:
            return {
                "success": False,
                "error": "Class teacher is not assigned for this section. Please assign one in Class management.",
            }

        self._seed_teacher_busy_state(teacher_ids)
        self._prefetch_teachers(teacher_ids)

        # Removed strict validation check for (total_required > total_slots) 
        # to allow 'best effort' generation as requested by the user. 
        # Unplaced subjects will still be returned in the 'meta' field.

        remaining = {need.subject_id: need.weekly_periods for need in allocations}
        need_map = {need.subject_id: need for need in allocations}
        daily_subject_count = {day: Counter() for day in self.working_days}
        
        draft = self._reconstitute_draft(remaining, daily_subject_count, need_map)
        
        # 1. Place pre-assigned (Class teacher first period)
        self._assign_class_teacher_first_period(draft, daily_subject_count, remaining, need_map)

        # 2. Main heuristic solver loop with 1-level limit backtracking
        unplaced = self._solve_constraints_with_backtracking(draft, remaining, daily_subject_count, need_map)

        return {
            "success": len(unplaced) == 0,
            "draft": self._serialize_draft(draft),
            "meta": {
                "unplaced": unplaced,
                "hard_constraints_applied": [
                    "teacher_no_double_booking",
                    "subject_teacher_mapping",
                    "backtracking_deadlock_resolution"
                ],
            },
        }

    def _solve_constraints_with_backtracking(self, draft, remaining, daily_subject_count, need_map) -> List[Dict]:
        """
        Attempts to place subjects using heuristic scores. 
        If it gets stuck, it tries to swap a previously assigned slot.
        """
        for day_index, day in enumerate(self.working_days):
            for period in range(1, self.periods_per_day + 1):
                if period in self.break_periods:
                    draft[day][period] = {"type": "break"}
                    continue
                if period in draft[day]:
                    continue

                candidates = [sid for sid, count in remaining.items() if count > 0]
                candidates.sort(key=lambda sid: remaining[sid], reverse=True)
                
                placed = self._attempt_placement(day, period, candidates, draft, remaining, daily_subject_count, need_map)
                
                # Simple Backtracking: If stuck, try swapping with another period today
                if not placed:
                    swapped = self._attempt_backtrack(day, period, candidates, draft, remaining, daily_subject_count, need_map)
                    if swapped:
                        placed = True

                if not placed:
                    draft[day][period] = {"type": "free"}

        # Collect unplaced
        unplaced = []
        for subject_id, count in remaining.items():
            if count > 0:
                unplaced.append({
                    "subject_id": subject_id,
                    "subject_name": need_map[subject_id].subject_name,
                    "remaining_periods": count,
                })
        return unplaced

    def _attempt_placement(self, day, period, candidates, draft, remaining, daily_subject_count, need_map) -> bool:
        best_score = None
        chosen_sid = None
        chosen_tid = None
        needs_consecutive = False

        for subject_id in candidates:
            # Respect "max once a day" unless disabled
            if not self.allow_same_subject_twice_day and daily_subject_count[day][subject_id] >= 1:
                if not need_map[subject_id].is_consecutive_required:
                    continue

            need = need_map[subject_id]
            teacher_id = self._pick_teacher_for_slot(need.teacher_ids, day, period)
            if not teacher_id:
                continue
                
            # If lab requires 2 periods, ensure period+1 is free and teacher is free
            if need.is_consecutive_required and remaining[subject_id] >= 2:
                next_p = period + 1
                if next_p in self.break_periods or next_p > self.periods_per_day:
                    continue  # Can't fit block
                if next_p in draft[day]:
                    continue  # Slot already occupied (Guard against overwrites)
                if self._teacher_busy(teacher_id, day, next_p):
                    continue

            # Heuristic score
            score = float(remaining[subject_id] * 10)
            score -= float(daily_subject_count[day].get(subject_id, 0) * 8)
            score -= self._teacher_day_load[teacher_id][day] * 2  # Spread teacher load!
            
            if best_score is None or score > best_score:
                best_score = score
                chosen_sid = subject_id
                chosen_tid = teacher_id
                needs_consecutive = need.is_consecutive_required and remaining[subject_id] >= 2

        if chosen_sid and chosen_tid:
            self._commit_slot(day, period, chosen_sid, chosen_tid, draft, remaining, daily_subject_count, need_map)
            if needs_consecutive:
                self._commit_slot(day, period + 1, chosen_sid, chosen_tid, draft, remaining, daily_subject_count, need_map)
            return True
        return False

    def _attempt_backtrack(self, day, period, candidates, draft, remaining, daily_subject_count, need_map) -> bool:
        """
        If we couldn't find a placement for `period` normally, look at earlier periods today.
        Can we un-assign period X, assign candidate to period X, and assign period X's old subject to `period`?
        """
        for subject_id in candidates:
            need = need_map[subject_id]
            
            for past_period in range(1, period):
                if past_period in self.break_periods:
                    continue
                    
                past_slot = draft[day].get(past_period, {})
                if past_slot.get("type") != "class":
                    continue
                
                past_sid = past_slot.get("subject_id")
                past_tid = past_slot.get("teacher_id")
                
                # Temporarily uncommit past_slot
                self._uncommit_slot(day, past_period, past_sid, past_tid, remaining, daily_subject_count)
                
                # Check if we can put our blocked candidate into past_period
                new_tid_for_past = self._pick_teacher_for_slot(need.teacher_ids, day, past_period)
                if new_tid_for_past:
                    # Now check if past_sid can go into current period
                    past_need = need_map[past_sid]
                    new_tid_for_current = self._pick_teacher_for_slot(past_need.teacher_ids, day, period)
                    
                    if new_tid_for_current:
                        # Success! Swap works. Commit both.
                        self._commit_slot(day, past_period, subject_id, new_tid_for_past, draft, remaining, daily_subject_count, need_map)
                        self._commit_slot(day, period, past_sid, new_tid_for_current, draft, remaining, daily_subject_count, need_map)
                        return True
                
                # Revert uncommit if swap failed
                self._recommit_soft(day, past_period, past_sid, past_tid, draft, remaining, daily_subject_count, need_map)
        return False

    def _commit_slot(self, day, period, sid, tid, draft, remaining, daily_subject_count, need_map):
        need = need_map[sid]
        draft[day][period] = {
            "type": "class",
            "subject_id": sid,
            "subject_name": need.subject_name,
            "teacher_id": tid,
            "teacher_name": self._teacher_name(tid),
        }
        remaining[sid] -= 1
        daily_subject_count[day][sid] += 1
        self._teacher_day_periods[tid][day].add(period)
        self._teacher_day_load[tid][day] += 1

    def _uncommit_slot(self, day, period, sid, tid, remaining, daily_subject_count):
        remaining[sid] += 1
        daily_subject_count[day][sid] -= 1
        self._teacher_day_periods[tid][day].remove(period)
        self._teacher_day_load[tid][day] -= 1
        
    def _recommit_soft(self, day, period, sid, tid, draft, remaining, daily_subject_count, need_map):
        """ Restores a slot's internal state AND the draft dictionary content. """
        self._commit_slot(day, period, sid, tid, draft, remaining, daily_subject_count, need_map)

    def _get_allocation_needs(self) -> List[AllocationNeed]:
        allocations = get_subject_allocations(self.section, self.academic_year)
        needs = []
        for allocation in allocations:
            teacher_ids = [allocation.teacher_id] if allocation.teacher_id else []
            if not teacher_ids: continue
            needs.append(AllocationNeed(
                subject_id=allocation.subject_id,
                subject_name=allocation.subject.name,
                weekly_periods=int(allocation.subject.weekly_periods or 0),
                teacher_ids=teacher_ids,
                is_consecutive_required="Lab" in allocation.subject.name or "Computer" in allocation.subject.name
            ))
        return needs

    def _seed_teacher_busy_state(self, teacher_ids: List[int]) -> None:
        teacher_day_periods = get_teacher_existing_commitments(
            teacher_ids=teacher_ids, academic_year=self.academic_year,
            working_days=self.working_days, exclude_section_id=self.section.id,
        )
        for tid, day_periods in teacher_day_periods.items():
            for day, periods in day_periods.items():
                self._teacher_day_periods[tid][day].update(periods)
                self._teacher_day_load[tid][day] += len(periods)

        # NEW: Hard Rule - A Class Teacher is ALWAYS busy in Period 1 for other sections 
        # (they must be in their own section)
        other_class_teachers = set(Section.objects.filter(
            class_teacher_id__in=teacher_ids,
            class_teacher_id__isnull=False
        ).exclude(id=self.section.id).values_list('class_teacher_id', flat=True))
        
        for tid in other_class_teachers:
            for day in self.working_days:
                self._teacher_day_periods[tid][day].add(1)

    def _assign_class_teacher_first_period(self, draft, daily_subject_count, remaining, need_map) -> None:
        if not self.class_teacher_first_period or not self.section.class_teacher_id: return
        class_teacher_id = self.section.class_teacher_id
        for day in self.working_days:
            if 1 in self.break_periods or self._teacher_busy(class_teacher_id, day, 1): continue
            
            sids = [sid for sid in need_map if class_teacher_id in need_map[sid].teacher_ids and remaining[sid] > 0]
            if sids:
                sid = max(sids, key=lambda s: remaining[s])
                self._commit_slot(day, 1, sid, class_teacher_id, draft, remaining, daily_subject_count, need_map)

    def _pick_teacher_for_slot(self, teacher_ids: List[int], day: int, period: int) -> Optional[int]:
        valid = []
        for teacher_id in teacher_ids:
            if self._teacher_busy(teacher_id, day, period): continue
            valid.append(teacher_id)
        if not valid: return None
        # Spread load by picking lowest utilized teacher that day
        return min(valid, key=lambda tid: self._teacher_day_load[tid][day])

    def _teacher_busy(self, teacher_id: int, day: int, period: int) -> bool:
        return period in self._teacher_day_periods[teacher_id][day]

    def _teacher_name(self, teacher_id: int) -> str:
        return self._teacher_cache.get(teacher_id, f"Teacher #{teacher_id}")

    def _prefetch_teachers(self, teacher_ids: List[int]):
        users = User.objects.filter(id__in=teacher_ids).only("id", "first_name", "last_name")
        for user in users:
            self._teacher_cache[user.id] = user.get_full_name()

    def _reconstitute_draft(self, remaining, daily_subject_count, need_map):
        draft = {day: {} for day in self.working_days}
        return draft

    @staticmethod
    def _serialize_draft(draft: Dict[int, Dict[int, Dict]]) -> List[Dict]:
        return [
            {"day_of_week": day, "periods": [{"period_number": p, **draft[day][p]} for p in sorted(draft[day])]}
            for day in sorted(draft)
        ]
