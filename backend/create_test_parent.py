import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, Parent, School, AcademicYear
from apps.students.models import Student
from django.contrib.auth.hashers import make_password

def create_test_parent():
    print("Creating Test Parent...")
    
    school = School.objects.first()
    if not school:
        print("Error: Run seed_school.py first.")
        return

    # 1. Create User
    username = "parent_test"
    password = "parent123"
    
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            "email": "parent@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "portal": "parent",
            "school": school,
            "is_active": True
        }
    )
    
    user.set_password(password)
    user.save()
    
    if created:
        print(f"User {username} created.")
    else:
        print(f"User {username} already exists, password updated.")

    # 2. Link to Student
    student = Student.objects.filter(user__username="student_test").first()
    if not student:
        print("Warning: student_test not found. Run create_test_student.py first.")
        parent_profile, _ = Parent.objects.get_or_create(user=user)
    else:
        parent_profile, _ = Parent.objects.get_or_create(user=user)
        parent_profile.students.add(student)
        print(f"Parent linked to student: {student.user.get_full_name()}")

    print("\n==============================")
    print("PARENT LOGIN CREDENTIALS")
    print(f"URL:      http://localhost:3000/parent/login")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print("==============================\n")

if __name__ == "__main__":
    create_test_parent()
