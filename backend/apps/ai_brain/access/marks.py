from __future__ import annotations

from apps.exams.models import Exam, ExamResult, ReportCard


def get_exam(exam_id: int):
    return Exam.objects.filter(id=exam_id).first()


def get_exam_results_for_student(student_id: int, exam_id: int):
    return ExamResult.objects.select_related("exam_schedule", "exam_schedule__subject").filter(
        student_id=student_id,
        exam_schedule__exam_id=exam_id,
    )


def get_exam_results_for_section(section_id: int, exam_id: int):
    return ExamResult.objects.select_related("student", "student__user").filter(
        student__section_id=section_id,
        exam_schedule__exam_id=exam_id,
    )


def get_or_create_report_card(student_id: int, exam_id: int):
    return ReportCard.objects.get_or_create(student_id=student_id, exam_id=exam_id)
