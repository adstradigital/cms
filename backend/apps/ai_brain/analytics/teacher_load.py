from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev
from typing import Any, Dict, List, Optional, Tuple

from apps.academics.models import Period


def _max_consecutive(period_numbers: List[int]) -> int:
    if not period_numbers:
        return 0
    period_numbers = sorted(set(int(p) for p in period_numbers))
    best = 1
    current = 1
    for i in range(1, len(period_numbers)):
        if period_numbers[i] == period_numbers[i - 1] + 1:
            current += 1
        else:
            best = max(best, current)
            current = 1
    return max(best, current)


class TeacherLoadAnalyzer:
    """
    Teacher Intelligence: load fairness and consecutive-period pressure.
    """

    def analyze(
        self,
        *,
        academic_year_id: int,
        working_days: Optional[List[int]] = None,
        school_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        working_days = sorted(set(working_days or [1, 2, 3, 4, 5, 6]))

        qs = Period.objects.filter(
            timetable__academic_year_id=academic_year_id,
            timetable__day_of_week__in=working_days,
            teacher_id__isnull=False,
            period_type="class",
        ).select_related("teacher", "timetable", "timetable__section")

        if school_id is not None:
            qs = qs.filter(timetable__section__school_class__school_id=school_id)

        by_teacher_day: Dict[int, Dict[int, List[int]]] = defaultdict(lambda: defaultdict(list))
        teacher_names: Dict[int, str] = {}
        for p in qs:
            tid = int(p.teacher_id)
            by_teacher_day[tid][int(p.timetable.day_of_week)].append(int(p.period_number))
            teacher_names[tid] = getattr(p.teacher, "get_full_name", lambda: None)() or getattr(p.teacher, "username", "") or str(tid)

        rows: List[Dict[str, Any]] = []
        totals: List[int] = []
        consecutive_peaks: List[int] = []
        for tid, day_map in by_teacher_day.items():
            day_loads = {day: len(periods) for day, periods in day_map.items()}
            total = sum(day_loads.values())
            totals.append(total)
            max_consec = max((_max_consecutive(periods) for periods in day_map.values()), default=0)
            consecutive_peaks.append(max_consec)
            rows.append(
                {
                    "teacher_id": tid,
                    "teacher_name": teacher_names.get(tid) or str(tid),
                    "total_periods": total,
                    "days_taught": len(day_map),
                    "avg_periods_per_day": round(total / max(1, len(day_map)), 2),
                    "max_consecutive_periods": max_consec,
                    "daily_loads": {str(day): int(cnt) for day, cnt in sorted(day_loads.items())},
                }
            )

        rows.sort(key=lambda r: (r.get("total_periods", 0), r.get("max_consecutive_periods", 0)), reverse=True)

        avg_total = mean(totals) if totals else 0.0
        stdev_total = pstdev(totals) if len(totals) > 1 else 0.0
        balance_score = 100.0
        if avg_total > 0:
            # Coefficient of variation scaled into 0..100 where lower variability is better.
            cv = (stdev_total / avg_total) if avg_total else 0.0
            balance_score = max(0.0, 100.0 - (cv * 120.0))

        overload_threshold = max(1.0, avg_total + stdev_total)
        overloaded = [r for r in rows if float(r.get("total_periods", 0)) >= overload_threshold]
        pressure = sum(1 for r in rows if int(r.get("max_consecutive_periods") or 0) >= 5)

        explanations = [
            "Teacher load is computed from scheduled class periods per teacher for the selected academic year.",
            f"Overload threshold is derived from distribution: avg={round(avg_total, 2)}, stdev={round(stdev_total, 2)}.",
        ]
        if overloaded:
            explanations.append(f"{len(overloaded)} teacher(s) appear overloaded compared to the average load.")
        if pressure:
            explanations.append(f"{pressure} teacher(s) have high consecutive-period pressure (>=5).")

        return {
            "academic_year_id": academic_year_id,
            "working_days": working_days,
            "teachers": rows,
            "overloaded": overloaded[:10],
            "scores": {
                "teacher_load_balance": float(round(max(0.0, min(100.0, balance_score)), 2)),
                "overload_risk": float(round(min(100.0, (len(overloaded) / max(1, len(rows))) * 100.0), 2)),
            },
            "confidence": 92 if rows else 60,
            "explanations": explanations,
        }

