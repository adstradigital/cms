import os
import django
import sys
import random
from datetime import datetime, timedelta

# Setup django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.exams.models import ExamType, Exam, ExamSchedule, ExamResult, QuestionBank, QuestionPaper, ReportTemplate, ReportCard
from apps.accounts.models import AcademicYear, School, User
from apps.students.models import Class, Student, Section
from apps.academics.models import Subject
from apps.staff.models import Staff

def seed():
    print("Starting Comprehensive Examination Data Seeding (v2)...")
    
    # 1. Core Prerequisites
    school = School.objects.first()
    if not school:
        print("❌ Error: No school found.")
        return
        
    ay = AcademicYear.objects.filter(is_active=True).first()
    if not ay:
        print("❌ Error: No active academic year found.")
        return
    
    # Get some teachers (Users who have a staff profile and are teaching staff)
    teachers = [s.user for s in Staff.objects.filter(is_teaching_staff=True)[:10]]
    if not teachers:
        print("❌ Error: No teaching staff found.")
        return
    admin_user = User.objects.filter(is_superuser=True).first() or teachers[0]

    # 2. Exam Types
    print("--- Seeding Exam Types ---")
    types_config = [
        {"name": "Unit Test 1", "weightage_percentage": 10, "passing_percentage": 40},
        {"name": "Unit Test 2", "weightage_percentage": 10, "passing_percentage": 40},
        {"name": "Mid-Term Examination", "weightage_percentage": 30, "passing_percentage": 35},
        {"name": "Annual Final Examination", "weightage_percentage": 50, "passing_percentage": 35},
    ]
    
    exam_types = {}
    for t in types_config:
        et, _ = ExamType.objects.get_or_create(
            name=t["name"], 
            academic_year=ay,
            defaults={
                "weightage_percentage": t["weightage_percentage"],
                "passing_percentage": t["passing_percentage"]
            }
        )
        exam_types[t["name"]] = et

    # 3. Classes & Subjects
    target_classes = Class.objects.all()[:3] # Seed for first 3 classes
    subjects = Subject.objects.all()[:8]

    # 4. Create Exams
    print("--- Seeding Exams & Schedules ---")
    mid_term_type = exam_types["Mid-Term Examination"]
    
    for cls in target_classes:
        exam_name = f"Mid-Term Assessment 2026 - {cls.name}"
        coordinator = random.choice(teachers)
        
        exam, created = Exam.objects.get_or_create(
            name=exam_name,
            school_class=cls,
            academic_year=ay,
            defaults={
                "exam_type": mid_term_type,
                "coordinator": coordinator,
                "description": f"Standardized mid-term evaluation for {cls.name}. Managed by {coordinator.get_full_name()}.",
                "start_date": datetime.now().date() + timedelta(days=5),
                "end_date": datetime.now().date() + timedelta(days=15),
                "is_published": True
            }
        )
        if created: print(f"  [OK] Created Exam: {exam_name}")

        # Schedules
        cls_subjects = subjects[:min(6, subjects.count())]
        for i, sub in enumerate(cls_subjects):
            invigilator = random.choice(teachers)
            schedule_date = exam.start_date + timedelta(days=i)
            
            schedule, _ = ExamSchedule.objects.get_or_create(
                exam=exam,
                subject=sub,
                defaults={
                    "date": schedule_date,
                    "start_time": "09:30:00",
                    "end_time": "12:30:00",
                    "max_theory_marks": 80,
                    "max_internal_marks": 20,
                    "pass_marks": 35,
                    "venue": f"Block B, Room {201 + i}",
                    "invigilator": invigilator
                }
            )
            
            # Seed some results for this schedule immediately
            # Get students for this class's sections
            sections = Section.objects.filter(school_class=cls)
            students = Student.objects.filter(section__in=sections)[:15] # Top 15 students
            
            for student in students:
                theory = random.uniform(30, 75)
                internal = random.uniform(10, 20)
                total = theory + internal
                grade = "A" if total > 90 else "B" if total > 75 else "C" if total > 60 else "D" if total > 40 else "F"
                
                ExamResult.objects.get_or_create(
                    student=student,
                    exam_schedule=schedule,
                    defaults={
                        "theory_marks": theory,
                        "internal_marks": internal,
                        "marks_obtained": total,
                        "grade": grade,
                        "entered_by": invigilator,
                        "remarks": "Evaluation completed."
                    }
                )

    # 5. Question Bank Authorship
    print("--- Seeding Question Bank Authors ---")
    for sub in subjects:
        author = random.choice(teachers)
        for j in range(5):
            QuestionBank.objects.get_or_create(
                subject=sub,
                text=f"Expert Question {j+1}: Concepts in {sub.name}?",
                defaults={
                    "question_type": "MCQ" if j % 2 == 0 else "DESC",
                    "marks": 4,
                    "created_by": author,
                    "options": ["Option A", "Option B", "Option C", "Option D"] if j % 2 == 0 else [],
                    "correct_answer": "Option A" if j % 2 == 0 else "Analysis of subject matter.",
                    "bloom_level": random.choice(["apply", "analyze", "evaluate", "understand"])
                }
            )

    # 6. Report Templates
    print("--- Seeding Report Templates ---")
    template, _ = ReportTemplate.objects.get_or_create(
        name="CBSE Standardized Vertical",
        defaults={
            "configuration_json": {
                "layout": "vertical",
                "show_attendance": True,
                "sections": ["Scholastic", "Co-Scholastic", "Remarks"],
                "color_scheme": "navy"
            }
        }
    )

    print("\n--- Success: Comprehensive data seeding finished ---")
    print(f"   Created {Exam.objects.count()} Exams")
    print(f"   Created {ExamSchedule.objects.count()} Scheduled Slots")
    print(f"   Created {ExamResult.objects.count()} Result Records")
    print(f"   Created {QuestionBank.objects.count()} Question Bank Items")

if __name__ == "__main__":
    seed()
