from __future__ import annotations

from typing import Any, Dict, List


def clamp_0_100(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return float(value)


def score_timetable_validation(issues: List[Dict[str, Any]] | None) -> Dict[str, float]:
    issues = issues or []
    error_count = sum(1 for i in issues if (i or {}).get("severity") == "error")
    warn_count = sum(1 for i in issues if (i or {}).get("severity") == "warning")

    # A simple, explainable heuristic score.
    base = 100.0
    base -= error_count * 18.0
    base -= warn_count * 6.0
    return {
        "timetable_health": clamp_0_100(base),
        "constraint_compliance": clamp_0_100(100.0 - (error_count * 20.0)),
    }


def score_timetable_generation(result: Dict[str, Any]) -> Dict[str, float]:
    meta = (result or {}).get("meta") or {}
    metrics = meta.get("metrics") or {}
    unplaced_count = int(metrics.get("unplaced_count") or 0)
    optimization_moves = int(metrics.get("optimization_moves") or 0)

    draft = result.get("draft") or []
    free_slots = 0
    class_slots = 0
    scored_slots = 0
    score_sum = 0.0
    for day in draft:
        for period in (day or {}).get("periods") or []:
            ptype = (period or {}).get("type")
            if ptype == "free":
                free_slots += 1
            if ptype == "class":
                class_slots += 1
                s = (period or {}).get("score")
                if isinstance(s, (int, float)):
                    scored_slots += 1
                    score_sum += float(s)

    fill_quality = 100.0 - (unplaced_count * 12.0) - (free_slots * 2.0)
    fill_quality = clamp_0_100(fill_quality)

    heuristic_quality = 85.0
    if scored_slots > 0:
        # Normalize a wide heuristic range into 0..100.
        avg = score_sum / scored_slots
        heuristic_quality = clamp_0_100(50.0 + (avg / 120.0) * 50.0)

    optimization_score = clamp_0_100(60.0 + min(40.0, optimization_moves * 6.0))
    overall = clamp_0_100((fill_quality * 0.55) + (heuristic_quality * 0.30) + (optimization_score * 0.15))

    return {
        "timetable_quality": overall,
        "fill_quality": fill_quality,
        "teacher_balance": heuristic_quality,
    }


def confidence_from_success(success: bool, *, partial: bool = False) -> int:
    if success and not partial:
        return 94
    if success and partial:
        return 82
    return 60

