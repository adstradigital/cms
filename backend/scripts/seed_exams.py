import os
import django
import sys
from datetime import datetime, timedelta

# Setup django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.exams.models import ExamType, Exam, ExamSchedule, QuestionBank, QuestionPaper
from apps.accounts.models import AcademicYear, School
from apps.students.models import Class
from apps.academics.models import Subject

def seed():
    print("Seeding Examination Data...")
    
    # 1. Ensure we have a school and academic year
    school = School.objects.first()
    if not school:
        print("No school found. Please run initial setup.")
        return
        
    ay = AcademicYear.objects.filter(is_active=True).first()
    if not ay:
        ay = AcademicYear.objects.create(name="2026-2027", start_date="2026-01-01", end_date="2026-12-31", is_active=True)
    
    # 2. Seed Exam Types
    types = [
        {"name": "Unit Test 1", "weightage_percentage": 10, "passing_percentage": 40},
        {"name": "Mid Term Examination", "weightage_percentage": 30, "passing_percentage": 35},
        {"name": "Final Examination", "weightage_percentage": 60, "passing_percentage": 35},
        {"name": "Practical / Viva", "weightage_percentage": 100, "passing_percentage": 40},
    ]
    
    exam_types = []
    for t in types:
        et, created = ExamType.objects.get_or_create(name=t["name"], defaults=t)
        exam_types.append(et)
        if created: print(f"  Created Exam Type: {t['name']}")

    # 3. Get first class and subjects
    cls = Class.objects.first()
    if not cls:
        print("No classes found. Cannot seed exams.")
        return
        
    subjects = Subject.objects.all()[:5] # Get first 5 subjects
    if not subjects.exists():
        print("No subjects found. Cannot seed schedules.")
        return

    # 4. Create a Sample Mid-Term Exam
    mid_term_type = ExamType.objects.get(name="Mid Term Examination")
    exam, created = Exam.objects.get_or_create(
        name="Mid Term Assessment 2026",
        school_class=cls,
        academic_year=ay,
        defaults={
            "exam_type": mid_term_type,
            "start_date": datetime.now().date() + timedelta(days=7),
            "end_date": datetime.now().date() + timedelta(days=14),
            "is_published": True
        }
    )
    if created: print(f"  Created Exam: {exam.name}")

    # 5. Create Schedules for the exam
    for i, sub in enumerate(subjects):
        schedule_date = exam.start_date + timedelta(days=i)
        ExamSchedule.objects.get_or_create(
            exam=exam,
            subject=sub,
            defaults={
                "date": schedule_date,
                "start_time": "10:00:00",
                "end_time": "13:00:00",
                "max_theory_marks": 80,
                "max_internal_marks": 20,
                "pass_marks": 35,
                "venue": f"Room {101 + i}"
            }
        )
    print(f"  Generated {subjects.count()} schedules for {exam.name}")

    # 6. Seed Question Bank
    for sub in subjects:
        for j in range(3):
            QuestionBank.objects.get_or_create(
                subject=sub,
                text=f"Example {sub.name} Question {j+1}?",
                defaults={
                    "question_type": "MCQ" if j == 0 else "DESC",
                    "marks": 5,
                    "options": ["Option A", "Option B", "Option C", "Option D"] if j == 0 else [],
                    "correct_answer": "Option A" if j == 0 else f"Explanation for {sub.name}",
                    "bloom_level": "apply" if j == 0 else "remember"
                }
            )
    print("  Seed Question Bank items complete.")

    print("Success: Examination seeding finished.")

if __name__ == "__main__":
    seed()
