from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Optional
import math
from collections import defaultdict

from ..actions import save_report_card
from ..access.attendance import get_student_attendance_summary
from ..access.marks import get_exam_results_for_section, get_exam_results_for_student
from ..access.students import get_students_by_section
from apps.exams.models import ExamResult, Exam


class ReportCardBuilder:
    """
    Upgraded AI Logic Engine using statistical distributions (Means, Z-Scores) 
    and historical trend analysis (Slope) natively, completely avoiding external LLMs.
    """
    
    def build_student_report_card_payload(self, student_id: int, exam_id: int, persist: bool = False) -> Dict:
        results = list(get_exam_results_for_student(student_id, exam_id))
        if not results:
            return {"success": False, "error": "No exam results found for this student and exam."}

        section_id = results[0].student.section_id
        
        # Pull section-wide data to compute analytics
        section_results = list(get_exam_results_for_section(section_id, exam_id))
        
        # 1. Base Aggregation
        total_obtained = Decimal("0")
        total_max = Decimal("0")
        subject_breakdown = []
        student_marks_by_subject = {}
        
        for result in results:
            max_marks = Decimal(str(result.exam_schedule.max_marks or 0))
            obtained = Decimal(str(result.marks_obtained or 0)) if not result.is_absent else Decimal("0")
            total_max += max_marks
            total_obtained += obtained
            student_marks_by_subject[result.exam_schedule.subject_id] = float(obtained)
            
            subject_breakdown.append({
                "subject_id": result.exam_schedule.subject_id,
                "subject_name": result.exam_schedule.subject.name,
                "marks_obtained": float(obtained),
                "max_marks": float(max_marks),
                "is_absent": result.is_absent,
            })

        percentage = float((total_obtained / total_max * 100) if total_max else 0)
        attendance_summary = get_student_attendance_summary(student_id)
        grade = self._grade_from_percentage(percentage)

        # 2. Advanced Analytics: Z-Score (Deviation from Mean)
        analytics = self._compute_subject_analytics(section_results)
        strong_subjects = []
        weak_subjects = []
        for subject_id, data in analytics.items():
            if subject_id not in student_marks_by_subject: continue
            
            score = student_marks_by_subject[subject_id]
            mean = data["mean"]
            std_dev = data["std_dev"]
            
            # Sub-populations may have 0 std_dev if everyone scored exactly the same
            if std_dev > 0:
                z_score = (score - mean) / std_dev
                if z_score > 1.0:
                    strong_subjects.append(data["subject_name"])
                elif z_score < -1.0:
                    weak_subjects.append(data["subject_name"])
            else:
                if score > mean * 1.05: strong_subjects.append(data["subject_name"])
                elif score < mean * 0.95: weak_subjects.append(data["subject_name"])

        # 3. Historical Trend Analysis
        trend_payload = self._analyze_historical_trend(student_id, exam_id)
        trend_status = trend_payload["trend"]
        
        # 4. Generate AI Actionable Feedback arrays natively based on conditions
        actionable_insights = self._generate_native_insights(
            percentage=percentage,
            grade=grade,
            attendance_percentage=attendance_summary["percentage"],
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            trend=trend_status
        )

        rank = self._compute_rank(section_results, student_id)

        report_data = {
            "student_id": student_id,
            "exam_id": exam_id,
            "total_marks": float(total_obtained),
            "percentage": round(percentage, 2),
            "grade": grade,
            "rank": rank,
            "attendance_percentage": attendance_summary["percentage"],
            "teacher_remarks_draft": actionable_insights["summary_sentence"],
            "ai_insights": {
                "strengths": strong_subjects,
                "weaknesses": weak_subjects,
                "trend": trend_status,
                "advice": actionable_insights["advice"]
            },
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

        response = {"success": True, "report_data": report_data}
        if save_meta:
            response["save_meta"] = save_meta
        return response

    def _compute_subject_analytics(self, section_results: List[ExamResult]) -> Dict:
        """ Calculates the Mean and Standard Deviation (Z-score components) per subject. """
        scores_by_subject = {}
        names_by_subject = {}
        
        for result in section_results:
            if result.is_absent: continue
            sid = result.exam_schedule.subject_id
            scores_by_subject.setdefault(sid, [])
            scores_by_subject[sid].append(float(result.marks_obtained or 0))
            names_by_subject[sid] = result.exam_schedule.subject.name
            
        analytics = {}
        for sid, scores in scores_by_subject.items():
            n = len(scores)
            mean = sum(scores) / n if n > 0 else 0
            variance = sum((x - mean) ** 2 for x in scores) / n if n > 0 else 0
            std_dev = math.sqrt(variance)
            analytics[sid] = {
                "subject_name": names_by_subject[sid],
                "mean": mean,
                "std_dev": std_dev
            }
        return analytics

    def _analyze_historical_trend(self, student_id: int, current_exam_id: int) -> Dict:
        """ Fetch previous exams in the same academic year and compare scores. """
        from apps.students.models import Student
        current_exam = Exam.objects.get(id=current_exam_id)
        student = Student.objects.get(id=student_id)
        past_exams = Exam.objects.filter(
            academic_year=current_exam.academic_year,
            school_class=student.section.school_class,
            start_date__lt=current_exam.start_date
        ).order_by('-start_date')[:2] # Look at last 2 exams
        
        if not past_exams:
            return {"trend": "neutral", "reason": "No previous exams to compare against."}
            
        # Get past results
        past_results = list(ExamResult.objects.filter(
            student_id=student_id, 
            exam_schedule__exam__in=past_exams
        ))
        
        by_exam = defaultdict(list)
        for pr in past_results:
            if not pr.is_absent: by_exam[pr.exam_schedule.exam_id].append(float(pr.marks_obtained or 0))
            
        if not by_exam:
            return {"trend": "neutral", "reason": "Missing historical data."}
            
        # Compute current percentage for comparison
        current_marks = list(ExamResult.objects.filter(student_id=student_id, exam_schedule__exam_id=current_exam_id))
        total_obt = sum(float(r.marks_obtained or 0) for r in current_marks if not r.is_absent)
        total_mx = sum(float(r.exam_schedule.max_marks or 0) for r in current_marks)
        current_pct = (total_obt / total_mx * 100) if total_mx else 0
        
        past_averages = []
        for eid in by_exam:
            # We need to compute percentage for EACH past exam to be accurate
            past_marks = [pr for pr in past_results if pr.exam_schedule.exam_id == eid]
            p_obt = sum(float(r.marks_obtained or 0) for r in past_marks if not r.is_absent)
            p_mx = sum(float(r.exam_schedule.max_marks or 0) for r in past_marks)
            past_averages.append((p_obt / p_mx * 100) if p_mx else 0)
            
        recent_past_avg = past_averages[0] if past_averages else 0
        
        # Trend sensitivity: +/- 1% is stable
        diff = current_pct - recent_past_avg
        if abs(diff) < 1.0:
            trend = "stable"
        else:
            trend = "improving" if diff > 0 else "declining"

        return {
            "trend": trend,
            "current_pct": round(current_pct, 2),
            "past_pct": round(recent_past_avg, 2)
        }

    def _generate_native_insights(self, percentage, grade, attendance_percentage, strong_subjects, weak_subjects, trend):
        """ Replaces rigid string returns with an intelligent advice array. """
        advice = []
        
        if percentage >= 90:
            summary = "Exceptional academic performance demonstrated."
        elif percentage >= 75:
            summary = "Strong performance with room for minor optimizations."
        elif percentage >= 50:
            summary = "Average performance; intervention recommended in core areas."
        else:
            summary = "Critical intervention required to bring student up to standard."
            
        # Constraint: Attendance impacts learning
        if attendance_percentage < 80:
            advice.append(f"Suboptimal attendance ({attendance_percentage}%) is actively impacting grade retention. Essential to improve attendance.")
            summary += " Poor attendance is heavily affecting results."
            
        # Constraint: Weak subjects
        if weak_subjects:
            advice.append(f"Targeted remedial coaching strongly recommended for: {', '.join(weak_subjects)}.")
            
        # Constraint: Strong subjects
        if strong_subjects:
            advice.append(f"Student shows high aptitude in {', '.join(strong_subjects)}. Encourage advanced lateral reading.")
            
        # Constraint: Trend
        if trend == "declining":
            advice.append("Performance trend is negative compared to previous examination cycle. Needs immediate evaluation.")
        elif trend == "improving":
            advice.append("Positive upward trajectory observed since last evaluation.")
            
        return {
            "summary_sentence": summary,
            "advice": advice
        }

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
                skipped.append({"student_id": student.id, "reason": result.get("error", "unknown_error")})

        return {
            "success": len(generated) > 0 and len(skipped) < len(students),
            "section_id": section_id,
            "exam_id": exam_id,
            "generated_count": len(generated),
            "skipped_count": len(skipped),
            "generated": generated,
            "skipped": skipped,
        }

    def _compute_rank(self, section_results: List[ExamResult], student_id: int) -> int:
        """ Ranks students by total marks, treating absent students as 0. """
        by_student = defaultdict(Decimal)
        scored_any = set()
        for row in section_results:
            if not row.is_absent:
                by_student[row.student_id] += Decimal(str(row.marks_obtained or 0))
                scored_any.add(row.student_id)
            else:
                by_student[row.student_id] += Decimal("0")

        # Sort all students who at least appeared or are in the results set
        sorted_ids = sorted(by_student.keys(), key=lambda sid: by_student[sid], reverse=True)
        
        if student_id not in sorted_ids:
            return 0
            
        # Standard rank (1, 2, 2, 4) or simple index? Simple index for now.
        return sorted_ids.index(student_id) + 1

    @staticmethod
    def _grade_from_percentage(percentage: float) -> str:
        if percentage >= 90: return "A+"
        if percentage >= 80: return "A"
        if percentage >= 70: return "B"
        if percentage >= 60: return "C"
        if percentage >= 50: return "D"
        return "E"
