"""
Auto-grading service for the Online Test module.
Handles MCQ (single/multi), True/False, and Fill-in-the-Blank auto-scoring.
Short/Long/Upload types are flagged for manual teacher review.
"""
from decimal import Decimal


def auto_grade_attempt(attempt):
    """
    Run auto-grading on all auto-gradeable questions in an attempt.
    Returns the total auto-scored marks.
    """
    total_auto = Decimal("0")
    has_manual = False

    for answer in attempt.answers.select_related("question").prefetch_related("selected_choices", "question__choices"):
        q = answer.question
        score = None

        if q.question_type in ("mcq_single", "truefalse"):
            score = _grade_mcq_single(answer, q)
        elif q.question_type == "mcq_multi":
            score = _grade_mcq_multi(answer, q)
        elif q.question_type == "fill":
            score = _grade_fill_blank(answer, q)
        elif q.question_type in ("short", "long", "upload"):
            has_manual = True
            continue  # Teacher must grade manually
        elif q.question_type == "divider":
            continue  # No marks, skip

        if score is not None:
            answer.auto_score = score
            answer.is_correct = score > 0
            answer.save(update_fields=["auto_score", "is_correct"])
            total_auto += score

    attempt.auto_score = total_auto

    # If all questions are auto-gradeable, mark as graded
    if not has_manual:
        attempt.status = "graded"
    else:
        attempt.status = "submitted"  # Needs manual review

    attempt.save(update_fields=["auto_score", "status"])
    return total_auto


def _grade_mcq_single(answer, question):
    """MCQ Single / True-False: one correct choice selected = full marks."""
    correct_choices = set(question.choices.filter(is_correct=True).values_list("id", flat=True))
    selected = set(answer.selected_choices.values_list("id", flat=True))

    if not selected:
        return Decimal("0")

    if selected == correct_choices:
        return Decimal(str(question.marks))

    # Wrong answer: apply negative marking if enabled
    if question.negative_marks > 0:
        return -Decimal(str(question.negative_marks))

    return Decimal("0")


def _grade_mcq_multi(answer, question):
    """
    MCQ Multiple: partial marking.
    Score = (correct_selected / total_correct) × marks
    If any wrong choice is selected, score = 0 (strict mode).
    """
    correct_ids = set(question.choices.filter(is_correct=True).values_list("id", flat=True))
    all_ids = set(question.choices.values_list("id", flat=True))
    selected_ids = set(answer.selected_choices.values_list("id", flat=True))

    if not selected_ids:
        return Decimal("0")

    wrong_selected = selected_ids - correct_ids
    if wrong_selected:
        # Student selected a wrong option — strict: zero
        if question.negative_marks > 0:
            return -Decimal(str(question.negative_marks))
        return Decimal("0")

    # All selected are correct — partial credit
    if not correct_ids:
        return Decimal("0")

    ratio = Decimal(len(selected_ids & correct_ids)) / Decimal(len(correct_ids))
    return (ratio * Decimal(str(question.marks))).quantize(Decimal("0.01"))


def _grade_fill_blank(answer, question):
    """
    Fill in the blank: case-insensitive match against accepted_answers JSON list.
    """
    accepted = question.accepted_answers or []
    if not accepted:
        return None  # No accepted answers configured — needs manual review

    student_text = (answer.text_answer or "").strip().lower()
    if not student_text:
        return Decimal("0")

    for accepted_answer in accepted:
        if student_text == str(accepted_answer).strip().lower():
            return Decimal(str(question.marks))

    # No match
    if question.negative_marks > 0:
        return -Decimal(str(question.negative_marks))
    return Decimal("0")


def compute_attempt_scores(attempt):
    """
    Recompute the auto_score and manual_score totals from individual answers.
    Called after a teacher grades a manual answer.
    """
    from django.db.models import Sum

    totals = attempt.answers.aggregate(
        total_auto=Sum("auto_score"),
        total_manual=Sum("manual_score"),
    )
    attempt.auto_score = totals["total_auto"] or Decimal("0")
    attempt.manual_score = totals["total_manual"] or Decimal("0")

    # Check if all manual questions have been graded
    ungraded = attempt.answers.filter(
        question__question_type__in=["short", "long", "upload"],
        manual_score__isnull=True,
    ).exists()

    if not ungraded:
        attempt.status = "graded"

    attempt.save(update_fields=["auto_score", "manual_score", "status"])
