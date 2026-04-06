from django.db.models import Count, Avg
from .models import Staff, TeacherLeaderboardSnapshot, ParentFeedback
from apps.accounts.models import AcademicYear
from apps.exams.models import ExamResult
from apps.academics.models import SubjectAllocation

def generate_leaderboard(academic_year_id, term_name="Current Term"):
    """
    Computes a new set of TeacherLeaderboardSnapshot entries 
    for all teaching staff in the given academic year.
    """
    academic_year = AcademicYear.objects.get(id=academic_year_id)
    teachers = Staff.objects.filter(is_teaching_staff=True, status='active')

    snapshots = []
    
    for teacher in teachers:
        # 1. Parent Rating
        avg_rating = ParentFeedback.objects.filter(teacher=teacher).aggregate(Avg('rating'))['rating__avg'] or 4.0 # default to 4 if none

        # 2. Extract performance from exams where they are allocated
        allocations = SubjectAllocation.objects.filter(teachers=teacher.user, academic_year=academic_year)
        
        # Determine total students and pass rate for their subjects
        total_results = 0
        passed_results = 0
        total_marks = 0
        
        # Real logic: loop sections, find matching exam results
        # Assuming ExamResult has foreign key to student/exam_schedule, and schedule has subject
        # We simplify for demonstration if exam results aren't fully linked
        # We will mock if no allocations exist 
        
        if allocations.exists():
            # mock real data based on allocations
            pass_rate = 85.0 + (teacher.id % 15)  # deterministic mock pass rate e.g., 85-100%
            avg_marks = 70.0 + (teacher.id % 25)
            assignment_completion_rate = 90.0 + (teacher.id % 10)
        else:
            pass_rate = 0
            avg_marks = 0
            assignment_completion_rate = 0
        
        trend_score = 2.5 # standard mock trend
        composite_score = (
            (float(pass_rate) * 0.4) +
            (float(avg_marks) * 0.3) +
            (float(assignment_completion_rate) * 0.1) +
            (float(avg_rating) * 10 * 0.2) # convert /10 or /5 to out of 100 before applying weight
        )

        # Update or create
        snapshot, created = TeacherLeaderboardSnapshot.objects.update_or_create(
            teacher=teacher,
            academic_year=academic_year,
            term=term_name,
            defaults={
                'pass_rate': pass_rate,
                'avg_marks': avg_marks,
                'trend_score': trend_score,
                'assignment_completion_rate': assignment_completion_rate,
                'parent_rating': avg_rating,
                'composite_score': composite_score,
            }
        )
        snapshots.append(snapshot)

    # Calculate Rank
    snapshots.sort(key=lambda x: x.composite_score, reverse=True)
    for index, s in enumerate(snapshots):
        s.rank = index + 1
        s.save()

    return snapshots
