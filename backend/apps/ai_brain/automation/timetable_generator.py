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
        self.ai_strategy = str(preferences.get("ai_strategy") or "balanced").strip() or "balanced"
        self.class_teacher_first_period = bool(preferences.get("class_teacher_first_period", False))
        self.max_consecutive_periods_teacher = int(preferences.get("max_consecutive_periods_teacher", 4))
        self.min_teacher_free_periods_per_day = int(preferences.get("min_teacher_free_periods_per_day", 1))
        self.allow_same_subject_twice_day = bool(preferences.get("allow_same_subject_twice_day", False))
        self.max_teacher_load_per_week = int(preferences.get("max_teacher_load_per_week", 30))
        self.max_teacher_periods_per_day = int(preferences.get("max_teacher_periods_per_day", 6))
        self.teacher_max_periods_per_day_overrides = preferences.get("teacher_max_periods_per_day") or {}
        self.teacher_unavailable = preferences.get("teacher_unavailable") or []
        self.preferred_morning_subject_ids = set(preferences.get("preferred_morning_subject_ids") or [])
        self.avoid_fixed_period_patterns = bool(preferences.get("avoid_fixed_period_patterns", True))
         
        # New Feature: Enforce lab subjects consecutive blocks if mentioned in preferences
        self.enforce_consecutive_labs = bool(preferences.get("enforce_consecutive_labs", True))

        self._remaining_need_weight = self._resolve_remaining_need_weight()
        self._subject_period_penalty_unit, self._teacher_period_penalty_unit = self._resolve_period_variety_penalties()

        self._teacher_day_periods: Dict[int, Dict[int, Set[int]]] = defaultdict(lambda: defaultdict(set))
        self._teacher_day_load: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self._teacher_cache: Dict[int, str] = {}
        self._subject_days_used: Dict[int, Set[int]] = defaultdict(set)
        self._subject_period_usage: Dict[int, Counter] = defaultdict(Counter)  # subject_id -> Counter(period_number)
        self._teacher_period_usage: Dict[int, Counter] = defaultdict(Counter)  # teacher_id -> Counter(period_number)
        self._initial_draft = config.get("initial_draft") or []

    def _resolve_remaining_need_weight(self) -> float:
        strategy = (self.ai_strategy or "").strip().lower()
        if strategy == "teacher_friendly":
            return 65.0
        if strategy == "academic_focus":
            return 85.0
        if strategy == "fast":
            return 95.0
        return 70.0

    def _resolve_period_variety_penalties(self) -> tuple[float, float]:
        if not self.avoid_fixed_period_patterns:
            return 12.0, 8.0
        strategy = (self.ai_strategy or "").strip().lower()
        if strategy == "teacher_friendly":
            return 95.0, 75.0
        if strategy == "academic_focus":
            return 75.0, 55.0
        if strategy == "fast":
            return 35.0, 25.0
        return 85.0, 65.0

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
        self._apply_teacher_unavailability(teacher_ids)

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

        # 3. Lightweight optimization pass (best-effort quality improvements)
        optimization_moves = self._optimize_subject_spread(draft, remaining, daily_subject_count, need_map, max_moves=8)

        return {
            "success": len(unplaced) == 0,
            "draft": self._serialize_draft(draft),
            "meta": {
                "unplaced": unplaced,
                "hard_constraints_applied": [
                    "teacher_no_double_booking",
                    "subject_teacher_mapping",
                    "teacher_max_consecutive_periods",
                    "teacher_max_periods_per_day",
                    "teacher_max_weekly_load",
                    "backtracking_deadlock_resolution"
                ],
                "metrics": {
                    "working_days": len(self.working_days),
                    "periods_per_day": self.periods_per_day,
                    "break_periods": len(self.break_periods),
                    "generated_days": len(draft),
                    "unplaced_count": len(unplaced),
                    "optimization_moves": optimization_moves,
                },
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
        best_score: Optional[float] = None
        chosen_sid: Optional[int] = None
        chosen_tid: Optional[int] = None
        chosen_reasons: List[str] = []
        needs_consecutive = False

        # Hardest-first: labs, fewer teachers, higher remaining
        candidates = sorted(
            candidates,
            key=lambda sid: (
                0 if not need_map[sid].is_consecutive_required else -1,
                len(need_map[sid].teacher_ids),
                -remaining.get(sid, 0),
            ),
        )

        for subject_id in candidates:
            # Respect "max once a day" unless disabled
            if not self.allow_same_subject_twice_day and daily_subject_count[day][subject_id] >= 1:
                if not need_map[subject_id].is_consecutive_required:
                    continue

            need = need_map[subject_id]

            candidate_teachers = list(need.teacher_ids)
            # Prefer lower loaded teachers first for faster pruning
            candidate_teachers.sort(key=lambda tid: self._teacher_day_load[tid][day])

            for teacher_id in candidate_teachers:
                if self._teacher_busy(teacher_id, day, period):
                    continue
                if self._would_exceed_weekly_load(teacher_id, extra_periods=1):
                    continue
                if self._would_exceed_daily_max(teacher_id, day, extra_periods=1):
                    continue
                if self._would_exceed_max_consecutive(teacher_id, day, [period]):
                    continue

                is_double = bool(need.is_consecutive_required and remaining[subject_id] >= 2 and self.enforce_consecutive_labs)
                if is_double:
                    next_p = period + 1
                    if next_p in self.break_periods or next_p > self.periods_per_day:
                        continue
                    if next_p in draft[day]:
                        continue
                    if self._teacher_busy(teacher_id, day, next_p):
                        continue
                    if self._would_exceed_weekly_load(teacher_id, extra_periods=2):
                        continue
                    if self._would_exceed_daily_max(teacher_id, day, extra_periods=2):
                        continue
                    if self._would_exceed_max_consecutive(teacher_id, day, [period, next_p]):
                        continue

                score, reasons = self._score_candidate(
                    subject_id=subject_id,
                    teacher_id=teacher_id,
                    day=day,
                    period=period,
                    subject_name=need.subject_name,
                    draft=draft,
                    daily_subject_count=daily_subject_count,
                    remaining=remaining,
                    is_double=is_double,
                )
                if best_score is None or score > best_score:
                    best_score = score
                    chosen_sid = subject_id
                    chosen_tid = teacher_id
                    chosen_reasons = reasons
                    needs_consecutive = is_double

        if chosen_sid and chosen_tid:
            self._commit_slot(
                day,
                period,
                chosen_sid,
                chosen_tid,
                draft,
                remaining,
                daily_subject_count,
                need_map,
                score=best_score,
                reasons=chosen_reasons,
                source="ai",
            )
            if needs_consecutive:
                self._commit_slot(
                    day,
                    period + 1,
                    chosen_sid,
                    chosen_tid,
                    draft,
                    remaining,
                    daily_subject_count,
                    need_map,
                    score=best_score,
                    reasons=chosen_reasons + ["Consecutive block continuation."],
                    source="ai",
                )
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
                        score1, reasons1 = self._score_candidate(
                            subject_id=subject_id,
                            teacher_id=new_tid_for_past,
                            day=day,
                            period=past_period,
                            subject_name=need.subject_name,
                            draft=draft,
                            daily_subject_count=daily_subject_count,
                            remaining=remaining,
                            is_double=False,
                        )
                        score2, reasons2 = self._score_candidate(
                            subject_id=past_sid,
                            teacher_id=new_tid_for_current,
                            day=day,
                            period=period,
                            subject_name=past_need.subject_name,
                            draft=draft,
                            daily_subject_count=daily_subject_count,
                            remaining=remaining,
                            is_double=False,
                        )
                        self._commit_slot(
                            day,
                            past_period,
                            subject_id,
                            new_tid_for_past,
                            draft,
                            remaining,
                            daily_subject_count,
                            need_map,
                            score=score1,
                            reasons=reasons1 + [f"Repair swap: moved from P{period} to P{past_period}."],
                            source="repair",
                        )
                        self._commit_slot(
                            day,
                            period,
                            past_sid,
                            new_tid_for_current,
                            draft,
                            remaining,
                            daily_subject_count,
                            need_map,
                            score=score2,
                            reasons=reasons2 + [f"Repair swap: moved from P{past_period} to P{period}."],
                            source="repair",
                        )
                        return True
                
                # Revert uncommit if swap failed
                self._recommit_soft(day, past_period, past_sid, past_tid, draft, remaining, daily_subject_count, need_map)
        return False

    def _commit_slot(
        self,
        day,
        period,
        sid,
        tid,
        draft,
        remaining,
        daily_subject_count,
        need_map,
        *,
        score: Optional[float] = None,
        reasons: Optional[List[str]] = None,
        source: str = "ai",
    ):
        need = need_map[sid]
        draft[day][period] = {
            "type": "class",
            "subject_id": sid,
            "subject_name": need.subject_name,
            "teacher_id": tid,
            "teacher_name": self._teacher_name(tid),
            "score": float(score) if score is not None else None,
            "reasons": reasons or [],
            "source": source,
        }
        remaining[sid] -= 1
        daily_subject_count[day][sid] += 1
        self._subject_days_used[sid].add(day)
        self._teacher_day_periods[tid][day].add(period)
        self._teacher_day_load[tid][day] += 1
        self._subject_period_usage[sid][period] += 1
        self._teacher_period_usage[tid][period] += 1

    def _uncommit_slot(self, day, period, sid, tid, remaining, daily_subject_count):
        remaining[sid] += 1
        daily_subject_count[day][sid] -= 1
        if daily_subject_count[day][sid] <= 0:
            daily_subject_count[day].pop(sid, None)
            if sid in self._subject_days_used and day in self._subject_days_used[sid]:
                self._subject_days_used[sid].discard(day)
        self._teacher_day_periods[tid][day].remove(period)
        self._teacher_day_load[tid][day] -= 1
        if self._subject_period_usage.get(sid, {}).get(period, 0) > 0:
            self._subject_period_usage[sid][period] -= 1
            if self._subject_period_usage[sid][period] <= 0:
                self._subject_period_usage[sid].pop(period, None)
        if self._teacher_period_usage.get(tid, {}).get(period, 0) > 0:
            self._teacher_period_usage[tid][period] -= 1
            if self._teacher_period_usage[tid][period] <= 0:
                self._teacher_period_usage[tid].pop(period, None)
        
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
                self._commit_slot(
                    day,
                    1,
                    sid,
                    class_teacher_id,
                    draft,
                    remaining,
                    daily_subject_count,
                    need_map,
                    score=9999.0,
                    reasons=["Rule applied: Class teacher assigned to Period 1."],
                    source="rule",
                )

    def _pick_teacher_for_slot(self, teacher_ids: List[int], day: int, period: int) -> Optional[int]:
        valid = []
        for teacher_id in teacher_ids:
            if self._teacher_busy(teacher_id, day, period): continue
            if self._would_exceed_weekly_load(teacher_id, extra_periods=1): continue
            if self._would_exceed_daily_max(teacher_id, day, extra_periods=1): continue
            if self._would_exceed_max_consecutive(teacher_id, day, [period]): continue
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
        if not self._initial_draft:
            return draft

        for row in self._initial_draft:
            day = int(row.get("day_of_week") or 0)
            if day not in draft:
                continue
            for slot in row.get("periods") or []:
                period_number = int(slot.get("period_number") or 0)
                if period_number <= 0 or period_number > self.periods_per_day:
                    continue
                if period_number in self.break_periods:
                    draft[day][period_number] = {"type": "break"}
                    continue

                slot_type = slot.get("type") or "free"
                if slot_type in {"event", "custom"}:
                    teacher_id = slot.get("teacher_id")
                    custom_title = slot.get("custom_title") or slot.get("title") or "Special Event"
                    try:
                        teacher_id_int = int(teacher_id) if teacher_id is not None else None
                    except Exception:
                        teacher_id_int = None

                    draft[day][period_number] = {
                        "type": "custom",
                        "custom_title": str(custom_title or "Special Event"),
                        "teacher_id": teacher_id_int,
                        "teacher_name": self._teacher_name(teacher_id_int) if teacher_id_int else "",
                        "score": 0.0,
                        "reasons": ["Reserved as custom period from initial draft."],
                        "source": "seed",
                    }
                    if teacher_id_int:
                        self._teacher_day_periods[teacher_id_int][day].add(period_number)
                        self._teacher_day_load[teacher_id_int][day] += 1
                        self._teacher_period_usage[teacher_id_int][period_number] += 1
                    continue

                if slot_type != "class":
                    continue

                subject_id = slot.get("subject_id")
                teacher_id = slot.get("teacher_id")
                if not subject_id or not teacher_id:
                    continue
                if subject_id not in need_map:
                    continue
                if remaining.get(subject_id, 0) <= 0:
                    continue
                if self._teacher_busy(int(teacher_id), day, period_number):
                    continue
                if self._would_exceed_weekly_load(int(teacher_id), extra_periods=1):
                    continue
                if self._would_exceed_max_consecutive(int(teacher_id), day, [period_number]):
                    continue

                self._commit_slot(
                    day,
                    period_number,
                    int(subject_id),
                    int(teacher_id),
                    draft,
                    remaining,
                    daily_subject_count,
                    need_map,
                    score=0.0,
                    reasons=["Seeded from initial draft."],
                    source="seed",
                )

        return draft

    def _would_exceed_weekly_load(self, teacher_id: int, *, extra_periods: int) -> bool:
        if self.max_teacher_load_per_week <= 0:
            return False
        current = sum(self._teacher_day_load[teacher_id].values())
        return current + extra_periods > self.max_teacher_load_per_week

    def _would_exceed_daily_max(self, teacher_id: int, day: int, *, extra_periods: int) -> bool:
        max_per_day = self._teacher_max_periods_per_day(teacher_id)
        if max_per_day <= 0:
            return False
        return self._teacher_day_load[teacher_id][day] + extra_periods > max_per_day

    def _teacher_max_periods_per_day(self, teacher_id: int) -> int:
        override = None
        if isinstance(self.teacher_max_periods_per_day_overrides, dict):
            override = self.teacher_max_periods_per_day_overrides.get(str(teacher_id))
            if override is None:
                override = self.teacher_max_periods_per_day_overrides.get(teacher_id)
        try:
            if override is not None:
                return int(override)
        except Exception:
            pass
        return int(self.max_teacher_periods_per_day)

    def _would_exceed_max_consecutive(self, teacher_id: int, day: int, new_periods: List[int]) -> bool:
        if self.max_consecutive_periods_teacher <= 0:
            return False
        periods = set(self._teacher_day_periods[teacher_id][day])
        periods.update(new_periods)
        return self._max_consecutive_run(periods) > self.max_consecutive_periods_teacher

    @staticmethod
    def _max_consecutive_run(periods: Set[int]) -> int:
        if not periods:
            return 0
        ordered = sorted(periods)
        best = 1
        current = 1
        for idx in range(1, len(ordered)):
            if ordered[idx] == ordered[idx - 1] + 1:
                current += 1
            else:
                current = 1
            best = max(best, current)
        return best

    def _score_candidate(
        self,
        *,
        subject_id: int,
        teacher_id: int,
        day: int,
        period: int,
        subject_name: str,
        draft,
        daily_subject_count,
        remaining,
        is_double: bool,
    ) -> tuple[float, List[str]]:
        score = 0.0
        reasons: List[str] = []

        remaining_count = int(remaining.get(subject_id, 0))
        score += remaining_count * float(self._remaining_need_weight)
        reasons.append(f"Subject needed: {remaining_count} remaining this week.")

        if daily_subject_count[day].get(subject_id, 0) == 0:
            score += 30.0
            reasons.append("Good spread: subject not yet placed today.")
        elif self.allow_same_subject_twice_day:
            score -= 10.0
            reasons.append("Allowed repeat: subject already placed today (soft penalty).")
        else:
            score -= 100.0
            reasons.append("Repeat today discouraged (soft penalty).")

        if day not in self._subject_days_used.get(subject_id, set()):
            score += 15.0
            reasons.append("Weekly spread: subject not yet used on this day.")
        else:
            score -= 10.0
            reasons.append("Weekly spread: subject already used on this day (soft penalty).")

        subject_period_repeats = int(self._subject_period_usage.get(subject_id, {}).get(period, 0))
        if subject_period_repeats > 0:
            early_multiplier = 1.25 if period <= 3 else 1.0
            penalty = float(self._subject_period_penalty_unit) * early_multiplier * float(subject_period_repeats)
            score -= penalty
            reasons.append(
                f"Variety: subject already used in this period on {subject_period_repeats} day(s) (penalty {penalty:.0f})."
            )

        teacher_period_repeats = int(self._teacher_period_usage.get(teacher_id, {}).get(period, 0))
        if teacher_period_repeats > 0:
            early_multiplier = 1.15 if period <= 3 else 1.0
            penalty = float(self._teacher_period_penalty_unit) * early_multiplier * float(teacher_period_repeats)
            score -= penalty
            reasons.append(
                f"Variety: teacher already teaching in this period on {teacher_period_repeats} day(s) (penalty {penalty:.0f})."
            )

        day_load = int(self._teacher_day_load[teacher_id][day])
        week_load = int(sum(self._teacher_day_load[teacher_id].values()))
        score += 100.0
        reasons.append("Teacher free: no double booking in this slot.")
        score -= day_load * 12.0
        reasons.append(f"Teacher daily load: {day_load} (penalty).")
        score -= week_load * 2.0
        reasons.append(f"Teacher weekly load: {week_load} (penalty).")

        teaching_slots_per_day = self.periods_per_day - len(self.break_periods)
        if teaching_slots_per_day > 0 and self.min_teacher_free_periods_per_day > 0:
            projected_load = day_load + (2 if is_double else 1)
            projected_free = teaching_slots_per_day - projected_load
            if projected_free < self.min_teacher_free_periods_per_day:
                score -= 60.0
                reasons.append("Teacher rest: would leave too few free periods today (soft penalty).")

        subject_name = (subject_name or "").lower()
        is_preferred_morning = subject_id in self.preferred_morning_subject_ids or any(
            token in subject_name for token in ["math", "mathematics", "physics", "chemistry"]
        )
        if is_preferred_morning and period <= 3:
            score += 10.0
            reasons.append("Learning fit: preferred morning subject in early period (bonus).")

        # Student load heuristic: avoid stacking core subjects back-to-back
        prev_slot = (draft.get(day) or {}).get(period - 1) if period > 1 else None
        prev_name = str(prev_slot.get("subject_name") or "").lower() if isinstance(prev_slot, dict) else ""
        is_core = any(token in subject_name for token in ["math", "mathematics", "physics", "chemistry", "biology"])
        prev_core = any(token in prev_name for token in ["math", "mathematics", "physics", "chemistry", "biology"])
        if is_core and prev_core:
            score -= 20.0
            reasons.append("Student load: core subject back-to-back (penalty).")

        if is_double:
            score += 25.0
            reasons.append("Lab rule: consecutive block satisfied (bonus).")

        return score, reasons

    def _optimize_subject_spread(
        self,
        draft: Dict[int, Dict[int, Dict]],
        remaining: Dict[int, int],
        daily_subject_count,
        need_map: Dict[int, AllocationNeed],
        *,
        max_moves: int = 8,
    ) -> int:
        """
        Best-effort post-pass: move a subject occurrence to a day where it's missing,
        without breaking hard teacher constraints. This is intentionally conservative.
        """
        moves = 0

        # Build current subject slots
        subject_slots: Dict[int, List[tuple[int, int, int]]] = defaultdict(list)  # sid -> [(day, period, tid)]
        for day, periods in (draft or {}).items():
            for period, slot in (periods or {}).items():
                if not isinstance(slot, dict) or slot.get("type") != "class":
                    continue
                sid = slot.get("subject_id")
                tid = slot.get("teacher_id")
                if not sid or not tid:
                    continue
                subject_slots[int(sid)].append((int(day), int(period), int(tid)))

        for sid, slots in subject_slots.items():
            if moves >= max_moves:
                break
            need = need_map.get(sid)
            if not need:
                continue

            total_target = int(need.weekly_periods or 0)
            if total_target < 4:
                continue

            days_used = set(d for (d, _, _) in slots)
            ideal_days = min(len(self.working_days), max(2, (total_target + 1) // 2))
            if len(days_used) >= ideal_days:
                continue

            missing_days = [d for d in self.working_days if d not in days_used]
            if not missing_days:
                continue

            moved = False
            for target_day in missing_days:
                if moved or moves >= max_moves:
                    break
                # Try moving any one slot to the same period on the target day
                for (from_day, from_period, tid) in slots:
                    if moved or moves >= max_moves:
                        break
                    if from_day == target_day:
                        continue
                    if from_period in self.break_periods:
                        continue
                    if self._teacher_busy(tid, target_day, from_period):
                        continue
                    if self._would_exceed_daily_max(tid, target_day, extra_periods=1):
                        continue
                    if self._would_exceed_max_consecutive(tid, target_day, [from_period]):
                        continue
                    # Only move into empty slot (missing key or free marker)
                    existing = draft[target_day].get(from_period)
                    if isinstance(existing, dict) and existing.get("type") not in {None, "free"}:
                        continue

                    # Perform move by uncommit + commit (net zero remaining)
                    self._uncommit_slot(from_day, from_period, sid, tid, remaining, daily_subject_count)
                    draft[from_day].pop(from_period, None)

                    score, reasons = self._score_candidate(
                        subject_id=sid,
                        teacher_id=tid,
                        day=target_day,
                        period=from_period,
                        subject_name=need.subject_name,
                        draft=draft,
                        daily_subject_count=daily_subject_count,
                        remaining=remaining,
                        is_double=False,
                    )
                    self._commit_slot(
                        target_day,
                        from_period,
                        sid,
                        tid,
                        draft,
                        remaining,
                        daily_subject_count,
                        need_map,
                        score=score,
                        reasons=reasons + [f"Optimization: spread {need.subject_name} to another day."],
                        source="optimize",
                    )
                    moves += 1
                    moved = True

        return moves

    def _apply_teacher_unavailability(self, teacher_ids: List[int]) -> None:
        """
        Marks teacher-unavailable slots as 'busy' so they are never assigned.
        Expected shapes (best-effort):
        - [{"teacher_id": 1, "day_of_week": 2, "periods": [1,2]}]
        - { "1": [{"day": 2, "periods": [1]}], "2": ... }
        - [(teacher_id, day, period), ...]
        """
        raw = self.teacher_unavailable
        if not raw:
            return

        def add_unavailable(tid: int, day: int, period: int):
            if tid not in teacher_ids:
                return
            if day not in self.working_days:
                return
            if period <= 0 or period > self.periods_per_day:
                return
            if period in self.break_periods:
                return
            self._teacher_day_periods[tid][day].add(period)

        if isinstance(raw, dict):
            for tid_key, entries in raw.items():
                try:
                    tid = int(tid_key)
                except Exception:
                    continue
                for entry in entries or []:
                    if not isinstance(entry, dict):
                        continue
                    day = entry.get("day") or entry.get("day_of_week")
                    try:
                        day = int(day)
                    except Exception:
                        continue
                    periods = entry.get("periods") or []
                    for p in periods:
                        try:
                            add_unavailable(tid, day, int(p))
                        except Exception:
                            continue
            return

        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, tuple) and len(item) == 3:
                    tid, day, period = item
                    try:
                        add_unavailable(int(tid), int(day), int(period))
                    except Exception:
                        continue
                    continue

                if not isinstance(item, dict):
                    continue
                tid = item.get("teacher_id") or item.get("teacher")
                day = item.get("day") or item.get("day_of_week")
                periods = item.get("periods") or []
                try:
                    tid = int(tid)
                    day = int(day)
                except Exception:
                    continue
                for p in periods:
                    try:
                        add_unavailable(tid, day, int(p))
                    except Exception:
                        continue

    @staticmethod
    def _serialize_draft(draft: Dict[int, Dict[int, Dict]]) -> List[Dict]:
        def _slot_explanation(day_of_week: int, period_number: int, slot: Dict) -> str | None:
            if not isinstance(slot, dict):
                return None
            if slot.get("type") != "class":
                return None
            subject = slot.get("subject_name") or "Subject"
            teacher = slot.get("teacher_name") or "Teacher"
            reasons = slot.get("reasons") or []
            top_reasons = "; ".join([r for r in reasons if isinstance(r, str)][:2])
            if top_reasons:
                return f"{subject} placed on day {day_of_week} P{period_number} ({teacher}) because: {top_reasons}."
            return f"{subject} placed on day {day_of_week} P{period_number} ({teacher}) based on constraints and availability."

        serialized = []
        for day in sorted(draft):
            periods = []
            for p in sorted(draft[day]):
                slot = draft[day][p]
                period_payload = {"period_number": p, **slot}
                explanation = _slot_explanation(day, p, slot)
                if explanation:
                    period_payload["explanation"] = explanation
                periods.append(period_payload)
            serialized.append({"day_of_week": day, "periods": periods})
        return serialized
