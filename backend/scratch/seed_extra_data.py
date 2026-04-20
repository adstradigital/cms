import sys
import os
import django
import random
from django.utils import timezone

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, School
from apps.students.models import Student, Section, Class
from apps.staff.models import Staff
from apps.permissions.models import Role

def seed_data():
    school = School.objects.first()
    if not school:
        print("No school found")
        return

    # Roles
    student_role, _ = Role.objects.get_or_create(name="student")
    staff_role, _ = Role.objects.get_or_create(name="staff")

    # Sections for students
    section = Section.objects.first()
    if not section:
        # Create a dummy class/section if none exist
        cls, _ = Class.objects.get_or_create(school=school, name="Grade 10", code="G10")
        section, _ = Section.objects.get_or_create(school_class=cls, name="A")

    # Seed Students
    student_names = [
        ("Liam", "Smith"), ("Noah", "Johnson"), ("Oliver", "Williams"), 
        ("James", "Brown"), ("Elijah", "Jones"), ("William", "Garcia"), 
        ("Henry", "Miller"), ("Lucas", "Davis"), ("Mason", "Rodriguez"), ("Ethan", "Martinez")
    ]
    
    for first, last in student_names:
        username = f"{first.lower()}_{last.lower()}_{random.randint(100, 999)}"
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_user(
                username=username,
                first_name=first,
                last_name=last,
                password="password123",
                portal=User.PORTAL_STUDENT,
                school=school
            )
            user.role = student_role
            user.save()
            
            Student.objects.create(
                user=user,
                admission_number=f"ADM-{random.randint(1000, 9999)}",
                section=section,
                admission_date=timezone.now().date()
            )
            print(f"Created student: {first} {last}")

    # Seed Staff
    staff_names = [
        ("Sophia", "Wilson"), ("Isabella", "Moore"), ("Mia", "Anderson"), 
        ("Charlotte", "Thomas"), ("Amelia", "Taylor"), ("Evelyn", "Harris"), 
        ("Abigail", "Clark"), ("Harper", "Lewis"), ("Emily", "Young"), ("Elizabeth", "Walker")
    ]
    designations = ["Teacher", "Senior Teacher", "Admin Staff", "Accountant", "Coordinator"]

    for first, last in staff_names:
        username = f"{first.lower()}_{last.lower()}_{random.randint(100, 999)}"
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_user(
                username=username,
                first_name=first,
                last_name=last,
                password="password123",
                portal=User.PORTAL_ADMIN, # Usually staff are in admin portal
                school=school
            )
            user.role = staff_role
            user.save()
            
            Staff.objects.create(
                user=user,
                employee_id=f"STF{random.randint(1000, 9999)}",
                designation=random.choice(designations),
                joining_date=timezone.now().date(),
                status='active'
            )
            print(f"Created staff: {first} {last}")

if __name__ == "__main__":
    seed_data()
