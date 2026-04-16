import os, sys, json
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Section
from apps.exams.models import Exam
from apps.accounts.models import AcademicYear, User
from apps.ai_brain.engine import AIBrainEngine

def main():
    print("====================================")
    print("🧠 TESTING AI BRAIN LOCALLY")
    print("====================================")
    
    engine = AIBrainEngine()
    
    # 1. Test Report Card
    print("\n[1] Testing Analytics AI (Report Card engine)...")
    exam = Exam.objects.first()
    section = Section.objects.first()
    
    if not exam or not section:
        print("ERROR: Run seed script first. Missing exam or section.")
        return
        
    print(f"Targeting Exam: {exam.name}")
    print(f"Targeting Section: {section.school_class.name} {section.name}")
    
    report_res = engine.run_report_card_builder_for_section(
        section_id=section.id, 
        exam_id=exam.id, 
        persist=False
    )
    
    if report_res["success"]:
        print(f"Successfully generated {report_res['generated_count']} report cards.")
        sample = report_res["generated"][0]
        print(f"Sample Student ID: {sample['student_id']}")
        print(f"Percentage: {sample['percentage']}% | Grade: {sample['grade']}")
        print("--- AI Generated Insights ---")
        print(json.dumps(sample["ai_insights"], indent=2))
        print("-----------------------------")
    else:
        print(f"Report Card Error: {report_res.get('error')}")

    # 2. Test Timetable
    print("\n[2] Testing Constraint AI (Timetable engine)...")
    
    config = {
        "periods_per_day": 8,
        "break_periods": [4],
        "working_days": [1, 2, 3, 4, 5, 6],
        "preferences": {
            "class_teacher_first_period": True,
            "max_consecutive_periods_teacher": 4,
            "min_teacher_free_periods_per_day": 0,
            "allow_same_subject_twice_day": False,
            "enforce_consecutive_labs": True,
        }
    }
    
    # Needs a random admin user to request
    admin = User.objects.filter(is_superuser=True).first()
    
    tt_res = engine.run_timetable_generation(
        section=section,
        academic_year=exam.academic_year,
        config=config,
        requested_by=admin,
        persist=False
    )
    
    if tt_res["success"]:
        print("Successfully generated Timetable without deadlocks!")
        meta = tt_res.get("meta", {})
        print("Unplaced Subjects:", meta.get("unplaced"))
        
        # Sneak peek at Monday
        monday = next((day for day in tt_res["draft"] if day["day_of_week"] == 1), None)
        if monday:
            print("\nMonday Sample Schedule:")
            for p in monday["periods"]:
                if p["type"] == "class":
                    print(f"P{p['period_number']}: {p['subject_name']} ({p.get('teacher_name')})")
                else:
                    print(f"P{p['period_number']}: BREAK")
    else:
        print(f"Timetable Error: {tt_res.get('error')}")

if __name__ == '__main__':
    main()
