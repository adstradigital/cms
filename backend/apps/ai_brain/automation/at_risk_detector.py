from __future__ import annotations

from decimal import Decimal
from typing import Dict, List

from ..access.attendance import get_section_attendance_summary
from ..access.marks import get_exam_results_for_section


class AtRiskDetector:
    def detect_section_risks(
        self,
        section_id: int,
        exam_id: int,
        min_attendance_pct: float = 75.0,
        min_marks_pct: float = 40.0,
    ) -> Dict:
        attendance_rows = list(get_section_attendance_summary(section_id))
        attendance_map = {}
        for row in attendance_rows:
            total = row["total"] or 0
            present = row["present"] or 0
            attendance_map[row["student_id"]] = (present / total * 100.0) if total else 0.0

        exam_rows = list(get_exam_results_for_section(section_id, exam_id))
        marks_total: Dict[int, Decimal] = {}
        marks_max: Dict[int, Decimal] = {}
        for row in exam_rows:
            sid = row.student_id
            marks_total.setdefault(sid, Decimal("0"))
            marks_max.setdefault(sid, Decimal("0"))
            marks_total[sid] += Decimal(str(row.marks_obtained or 0))
            marks_max[sid] += Decimal(str(row.exam_schedule.max_marks or 0))

        flagged: List[Dict] = []
        for student_id, obtained in marks_total.items():
            max_marks = marks_max.get(student_id, Decimal("0"))
            marks_pct = float((obtained / max_marks * 100) if max_marks else 0)
            attendance_pct = attendance_map.get(student_id, 0.0)
            reasons = []
            if attendance_pct < min_attendance_pct:
                reasons.append("low_attendance")
            if marks_pct < min_marks_pct:
                reasons.append("low_marks")
            if reasons:
                flagged.append(
                    {
                        "student_id": student_id,
                        "attendance_percentage": round(attendance_pct, 2),
                        "marks_percentage": round(marks_pct, 2),
                        "reasons": reasons,
                    }
                )

        return {
            "success": True,
            "section_id": section_id,
            "exam_id": exam_id,
            "thresholds": {
                "min_attendance_pct": min_attendance_pct,
                "min_marks_pct": min_marks_pct,
            },
            "flagged_students": flagged,
        }
