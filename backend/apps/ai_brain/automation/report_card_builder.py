from __future__ import annotations

from decimal import Decimal
from typing import Dict

from ..actions import save_report_card
from ..access.attendance import get_student_attendance_summary
from ..access.marks import get_exam_results_for_section, get_exam_results_for_student
from ..access.students import get_students_by_section


class ReportCardBuilder:
    def build_student_report_card_payload(self, student_id: int, exam_id: int, persist: bool = False) -> Dict:
        results = list(get_exam_results_for_student(student_id, exam_id))
        if not results:
            return {"success": False, "error": "No exam results found for this student and exam."}

        total_obtained = Decimal("0")
        total_max = Decimal("0")
        subject_breakdown = []
        for result in results:
            max_marks = Decimal(str(result.exam_schedule.max_marks or 0))
            obtained = Decimal(str(result.marks_obtained or 0))
            total_max += max_marks
            total_obtained += obtained
            subject_breakdown.append(
                {
                    "subject_id": result.exam_schedule.subject_id,
                    "subject_name": result.exam_schedule.subject.name,
                    "marks_obtained": float(obtained),
                    "max_marks": float(max_marks),
                    "is_absent": result.is_absent,
                }
            )

        percentage = float((total_obtained / total_max * 100) if total_max else 0)
        attendance_summary = get_student_attendance_summary(student_id)
        grade = self._grade_from_percentage(percentage)
        remarks = self._default_remarks(percentage, attendance_summary["percentage"])

        rank = self._compute_rank(student_id=student_id, section_id=results[0].student.section_id, exam_id=exam_id)

        report_data = {
            "student_id": student_id,
            "exam_id": exam_id,
            "total_marks": float(total_obtained),
            "percentage": round(percentage, 2),
            "grade": grade,
            "rank": rank,
            "attendance_percentage": attendance_summary["percentage"],
            "teacher_remarks_draft": remarks,
            "subject_breakdown": subject_breakdown,
        }

        save_meta = None
        if persist:
            save_meta = save_report_card(
                student_id=student_id,
                exam_id=exam_id,
                total_marks=report_data["total_marks"],
                percentage=report_data["percentage"],
                grade=report_data["grade"],
                rank=report_data["rank"],
                teacher_remarks=report_data["teacher_remarks_draft"],
            )

        response = {
            "success": True,
            "report_data": report_data,
        }
        if save_meta:
            response["save_meta"] = save_meta
        return response

    def build_section_report_cards(self, section_id: int, exam_id: int, persist: bool = True) -> Dict:
        students = list(get_students_by_section(section_id))
        if not students:
            return {"success": False, "error": "No active students found for this section."}

        generated = []
        skipped = []
        for student in students:
            result = self.build_student_report_card_payload(student_id=student.id, exam_id=exam_id, persist=persist)
            if result.get("success"):
                generated.append(result["report_data"])
            else:
                skipped.append(
                    {
                        "student_id": student.id,
                        "reason": result.get("error", "unknown_error"),
                    }
                )

        return {
            "success": len(generated) > 0,
            "section_id": section_id,
            "exam_id": exam_id,
            "generated_count": len(generated),
            "skipped_count": len(skipped),
            "generated": generated,
            "skipped": skipped,
        }

    def _compute_rank(self, student_id: int, section_id: int, exam_id: int) -> int:
        section_results = get_exam_results_for_section(section_id, exam_id)
        by_student = {}
        for row in section_results:
            sid = row.student_id
            by_student.setdefault(sid, Decimal("0"))
            by_student[sid] += Decimal(str(row.marks_obtained or 0))

        sorted_ids = sorted(by_student.keys(), key=lambda sid: by_student[sid], reverse=True)
        if student_id not in sorted_ids:
            return 0
        return sorted_ids.index(student_id) + 1

    @staticmethod
    def _grade_from_percentage(percentage: float) -> str:
        if percentage >= 90:
            return "A+"
        if percentage >= 80:
            return "A"
        if percentage >= 70:
            return "B"
        if percentage >= 60:
            return "C"
        if percentage >= 50:
            return "D"
        return "E"

    @staticmethod
    def _default_remarks(percentage: float, attendance_percentage: float) -> str:
        if percentage >= 85 and attendance_percentage >= 90:
            return "Excellent performance with very consistent participation."
        if percentage >= 70:
            return "Good overall progress. Continue regular revision for stronger outcomes."
        if attendance_percentage < 75:
            return "Performance is affected by low attendance. Regular attendance is strongly recommended."
        return "Needs focused support and consistent practice in weak subjects."
