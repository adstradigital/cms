import os
import django
from datetime import date
import random

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import School, AcademicYear, User
from apps.students.models import Class, Section, Student
from apps.staff.models import Staff, TeacherDetail
from apps.academics.models import Subject
from django.contrib.auth.hashers import make_password

def seed_data():
    print("============================================================")
    print("  SEEDING CBSE SCHOOL DATA: my cbse school")
    print("============================================================")

    # 1. School
    school, created = School.objects.get_or_create(
        name="my cbse school",
        defaults={
            'tagline': "Excellence in CBSE Education",
            'address': "456 CBSE Lane, New Delhi, India",
            'phone': "+91 11 2345 6789",
            'email': "contact@mycbseschool.edu",
            'website': "https://mycbseschool.edu",
            'primary_color': "#1e3a8a",  # Deep Blue
            'secondary_color': "#f59e0b", # Amber
        }
    )
    if created:
        print(f"  [+] Created School: {school.name}")
    else:
        # Update existing school name if needed or other fields
        school.name = "my cbse school"
        school.save()
        print(f"  [*] Using School: {school.name}")

    # 2. Academic Year
    current_year = date.today().year
    year_name = f"{current_year}-{str(current_year + 1)[2:]}"
    academic_year, year_created = AcademicYear.objects.get_or_create(
        school=school,
        name=year_name,
        defaults={
            'start_date': date(current_year, 4, 1),
            'end_date': date(current_year + 1, 3, 31),
            'is_active': True
        }
    )
    if year_created:
        print(f"  [+] Created Academic Year: {academic_year.name}")
    else:
        academic_year.is_active = True
        academic_year.save()
        print(f"  [*] Academic Year active: {academic_year.name}")

    # 3. Classes and Sections
    class_names = [
        "LKG", "UKG", 
        "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
        "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
        "Grade 11 Science", "Grade 11 Commerce",
        "Grade 12 Science", "Grade 12 Commerce"
    ]
    
    classes_map = {}
    sections_map = {}

    for name in class_names:
        cls, created = Class.objects.get_or_create(
            school=school,
            name=name,
            defaults={'code': name.replace(" ", "").upper()}
        )
        classes_map[name] = cls
        
        # Default Section A
        section, s_created = Section.objects.get_or_create(
            school_class=cls,
            name="A",
            defaults={'capacity': 40}
        )
        sections_map[name] = section

    print(f"  [+] Created {len(class_names)} Classes and Sections.")

    # 4. Subjects
    subjects_data = {
        "LKG": ["English", "Mathematics", "EVS", "Rhymes", "Drawing"],
        "UKG": ["English", "Mathematics", "EVS", "Rhymes", "Drawing"],
        "Grade 1": ["English", "Hindi", "Mathematics", "EVS", "Computer", "Value Education"],
        "Grade 2": ["English", "Hindi", "Mathematics", "EVS", "Computer", "Value Education"],
        "Grade 3": ["English", "Hindi", "Mathematics", "EVS", "Computer", "Social Studies"],
        "Grade 4": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Computer"],
        "Grade 5": ["English", "Hindi", "Mathematics", "Science", "Social Studies", "Computer"],
        "Grade 6": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer"],
        "Grade 7": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer"],
        "Grade 8": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer"],
        "Grade 9": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Information Technology"],
        "Grade 10": ["English", "Hindi", "Mathematics", "Science", "Social Science", "Information Technology"],
        "Grade 11 Science": ["English Core", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"],
        "Grade 11 Commerce": ["English Core", "Accountancy", "Business Studies", "Economics", "Mathematics", "Informatics Practices"],
        "Grade 12 Science": ["English Core", "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science"],
        "Grade 12 Commerce": ["English Core", "Accountancy", "Business Studies", "Economics", "Mathematics", "Informatics Practices"],
    }

    sub_count = 0
    for cls_name, subs in subjects_data.items():
        cls = classes_map[cls_name]
        for sub_name in subs:
            code = f"{cls.code}-{sub_name[:3].upper()}"
            Subject.objects.get_or_create(
                school=school,
                school_class=cls,
                name=sub_name,
                defaults={'code': code}
            )
            sub_count += 1
    print(f"  [+] Seeded {sub_count} Subjects across classes.")

    # 5. Staff
    staff_roles = [
        ("principal_user", "Principal", "principal@mycbseschool.edu", "Dr. Rajesh Kumar"),
        ("admin_user", "Administrator", "admin@mycbseschool.edu", "Mr. Amit Sharma"),
        ("teacher_sci", "Senior Teacher", "teacher.sci@mycbseschool.edu", "Ms. Sunita Gupta"),
        ("teacher_com", "Senior Teacher", "teacher.com@mycbseschool.edu", "Mr. Vijay Singh"),
    ]

    for username, design, email, full_name in staff_roles:
        first_name, last_name = full_name.split(" ", 1)
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'password': make_password('Pass@123'),
                'school': school,
                'portal': User.PORTAL_ADMIN
            }
        )
        if created:
            # Create Staff Profile
            staff = Staff.objects.create(
                user=user,
                employee_id=f"EMP-{random.randint(1000, 9999)}",
                designation=design,
                joining_date=date(2020, 1, 1),
                is_teaching_staff=(design != "Administrator")
            )
            if staff.is_teaching_staff:
                TeacherDetail.objects.create(staff=staff, specialization="General")
            print(f"  [+] Created Staff: {full_name}")

    # 6. Students (Sample)
    for cls_name, section in sections_map.items():
        for i in range(1, 3): # 2 students per class to be faster
            username = f"std_{cls_name.lower().replace(' ', '_')}_{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f"{username}@mycbseschool.edu",
                    'first_name': f"Student",
                    'last_name': f"{cls_name} {i}",
                    'password': make_password('Pass@123'),
                    'school': school,
                    'portal': User.PORTAL_STUDENT
                }
            )
            if created:
                Student.objects.create(
                    user=user,
                    admission_number=f"ADM-{cls_name.replace(' ', '')}-{i}-{random.randint(100, 999)}",
                    roll_number=str(i),
                    academic_year=academic_year,
                    section=section,
                    admission_date=date.today()
                )
    print(f"  [+] Created sample students for all classes.")

    print("============================================================")
    print("  SEEDING COMPLETE!")
    print("============================================================")

if __name__ == "__main__":
    seed_data()
