import os
import django
from django.contrib.auth.hashers import make_password
from datetime import date

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import School, AcademicYear, User, UserProfile
from apps.students.models import Class, Section, Student

def create_student():
    print("Creating Test Student...")
    
    # 1. Get School and Academic Year
    school = School.objects.first()
    if not school:
        print("Error: No school found. Run seed_school.py first.")
        return
        
    academic_year = AcademicYear.objects.filter(school=school, is_active=True).first()
    if not academic_year:
        print("Error: No active academic year found.")
        return

    # 2. Create Class and Section
    school_class, _ = Class.objects.get_or_create(
        school=school,
        name="Grade 10",
        defaults={'code': 'G10'}
    )
    
    section, _ = Section.objects.get_or_create(
        school_class=school_class,
        name="A"
    )

    # 3. Create Student User
    username = "student_test"
    password = "password123" # Simple password for testing
    
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': 'student@example.com',
            'first_name': 'Test',
            'last_name': 'Student',
            'password': make_password(password),
            'school': school,
            'portal': User.PORTAL_STUDENT
        }
    )
    
    if not created:
        user.set_password(password)
        user.save()
        print(f"User {username} already exists, password updated.")
    else:
        print(f"User {username} created.")

    # 4. Create Profile
    UserProfile.objects.get_or_create(user=user)

    # 5. Create Student Profile
    student, s_created = Student.objects.get_or_create(
        user=user,
        defaults={
            'admission_number': 'ADM-2026-001',
            'roll_number': '101',
            'academic_year': academic_year,
            'section': section,
            'admission_date': date.today(),
        }
    )
    
    if s_created:
        print("Student record created successfully.")
    else:
        print("Student record already exists.")

    print("\n" + "="*30)
    print("LOGIN CREDENTIALS")
    print(f"URL:      http://localhost:3000/login")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print("="*30)

if __name__ == "__main__":
    create_student()
