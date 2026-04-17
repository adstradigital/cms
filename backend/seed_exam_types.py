import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.exams.models import ExamType
from apps.accounts.models import AcademicYear

def seed():
    # Get active academic year
    ay = AcademicYear.objects.filter(is_active=True).first()
    if not ay:
        print("No active academic year found. Cannot seed.")
        return

    exam_types = [
        {"name": "Unit Test", "weightage_percentage": 10, "passing_percentage": 40, "max_theory_marks": 20, "max_internal_marks": 0, "is_online": False},
        {"name": "Class Test", "weightage_percentage": 5, "passing_percentage": 40, "max_theory_marks": 10, "max_internal_marks": 0, "is_online": False},
        {"name": "Mid-Term Examination", "weightage_percentage": 30, "passing_percentage": 35, "max_theory_marks": 40, "max_internal_marks": 10, "is_online": False},
        {"name": "Final / Annual Examination", "weightage_percentage": 50, "passing_percentage": 35, "max_theory_marks": 80, "max_internal_marks": 20, "is_online": False},
        {"name": "Model Examination / Mock Test", "weightage_percentage": 0, "passing_percentage": 35, "max_theory_marks": 80, "max_internal_marks": 20, "is_online": False},
        {"name": "Internal Assessment / Project", "weightage_percentage": 5, "passing_percentage": 40, "max_theory_marks": 0, "max_internal_marks": 20, "is_online": False},
        {"name": "Online MCQ Assessment", "weightage_percentage": 10, "passing_percentage": 40, "max_theory_marks": 50, "max_internal_marks": 0, "is_online": True},
    ]

    for et_data in exam_types:
        obj, created = ExamType.objects.get_or_create(
            name=et_data["name"],
            academic_year=ay,
            defaults={
                "weightage_percentage": et_data["weightage_percentage"],
                "passing_percentage": et_data["passing_percentage"],
                "max_theory_marks": et_data["max_theory_marks"],
                "max_internal_marks": et_data["max_internal_marks"],
                "is_online": et_data["is_online"]
            }
        )
        if created:
            print(f"Created Exam Type: {obj.name}")
        else:
            print(f"Exam Type already exists: {obj.name}")

if __name__ == "__main__":
    seed()
