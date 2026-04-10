import os
import django
import random
from datetime import date
from django.contrib.auth.hashers import make_password

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import School, AcademicYear, User, UserProfile
from apps.students.models import Class, Section, Student
from apps.staff.models import Staff, TeacherDetail
from apps.academics.models import Subject, SubjectAllocation

def run():
    print("Starting Detailed Seeding Operation...")

    # 1. Access core school context
    try:
        school = School.objects.get(name="my cbse school")
    except School.DoesNotExist:
        print("Error: School 'my cbse school' not found.")
        return
        
    academic_year = AcademicYear.objects.filter(school=school, is_active=True).first()
    
    if not academic_year:
        print("Error: Active academic year not found. Please ensure one exists.")
        return

    # 2. SEED STAFF (40 Teachers)
    print("Seeding 40 Teachers...")
    teacher_names = [
        ("Rajesh", "Iyer"), ("Sita", "Ramakrishnan"), ("Arjun", "Kapoor"), ("Deepika", "Padma"),
        ("Vikram", "Seth"), ("Ananya", "Pandey"), ("Karthik", "Aryan"), ("Sneha", "Reddy"),
        ("Rahul", "Deshmukh"), ("Priya", "Sharma"), ("Amit", "Verma"), ("Neha", "Gupta"),
        ("Suresh", "Rao"), ("Meena", "Kumari"), ("Kavita", "Krishnan"), ("Sanjay", "Dutt"),
        ("Anita", "Desai"), ("Manish", "Malhotra"), ("Pooja", "Hegde"), ("Rohan", "Mehra"),
        ("Ishaan", "Khatter"), ("Janhvi", "Kapoor"), ("Sara", "Khan"), ("Varun", "Dhawan"),
        ("Alia", "Bhatt"), ("Ranbir", "Kapoor"), ("Shahid", "Shah"), ("Kareena", "Khan"),
        ("Akshay", "Kumar"), ("Twinkle", "Khanna"), ("Sushmita", "Sen"), ("Lara", "Dutta"),
        ("Preity", "Zinta"), ("Rani", "Mukerji"), ("Kajol", "Devgn"), ("Abhishek", "Bachchan"),
        ("Aishwarya", "Rai"), ("Hrithik", "Roshan"), ("Tiger", "Shroff"), ("Disha", "Patani")
    ]
    
    specializations = [
        "Pure Mathematics", "Quantum Physics", "Organic Chemistry", "Microbiology", 
        "English Literature", "Modern History", "Geography", "Computer Science", 
        "Fine Arts", "Economics", "Accountancy", "Business Studies", "Physical Education"
    ]

    teachers_list = []
    for i, (fn, ln) in enumerate(teacher_names):
        username = f"teacher_{fn.lower()}_{i}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@mycbseschool.edu",
                'first_name': fn,
                'last_name': ln,
                'password': make_password('Pass@123'),
                'school': school,
                'portal': User.PORTAL_ADMIN
            }
        )
        # Profile
        UserProfile.objects.get_or_create(user=user)
        
        # Staff Profile
        staff, s_created = Staff.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': f"STF{str(i+10).zfill(3)}",
                'designation': "Senior Teacher",
                'joining_date': date(2021, 1, 1),
                'status': 'active',
                'is_teaching_staff': True,
                'experience_years': random.randint(2, 15)
            }
        )
        if s_created or not hasattr(staff, 'teacher_detail'):
            TeacherDetail.objects.get_or_create(
                staff=staff,
                defaults={'specialization': random.choice(specializations)}
            )
        teachers_list.append(user)

    print(f"Verified {len(teachers_list)} teachers.")

    # 3. DETAIL SECTIONS AND SUBJECTS
    print("Detailing Sections and Subjects...")
    sections = Section.objects.filter(school_class__school=school)
    for i, sec in enumerate(sections):
        sec.room_number = f"R-{101 + i}" if i < 10 else f"L-{201 + i-10}"
        sec.capacity = 40
        sec.save()

    subjects = Subject.objects.filter(school=school)
    for sub in subjects:
        sub.weekly_periods = random.randint(5, 7)
        sub.save()

    # 4. SUBJECT ALLOCATION (Strict Logic for Timetable)
    print("Performing Subject Allocations...")
    teacher_pool = list(teachers_list)
    alloc_count = 0
    for sec in sections:
        sec_subjects = Subject.objects.filter(school_class=sec.school_class)
        for sub in sec_subjects:
            # Pick a teacher for this subject-section
            teacher = random.choice(teacher_pool)
            
            alloc, a_created = SubjectAllocation.objects.get_or_create(
                subject=sub,
                section=sec,
                academic_year=academic_year
            )
            alloc.teachers.clear()
            alloc.teachers.add(teacher)
            alloc_count += 1
    
    print(f"Created {alloc_count} Subject Allocations.")

    # 5. STUDENT POPULATION (20 per Class)
    print("Seeding 320+ Students (20 per class)...")
    last_names = ["Kumar", "Sharma", "Singh", "Gupta", "Verma", "Rao", "Reddy", "Patel"]
    
    for sec in sections:
        cls_name = sec.school_class.name
        existing_students = Student.objects.filter(section=sec).count()
        needed = 20 - existing_students if existing_students < 20 else 0
        
        for i in range(needed):
            idx = existing_students + i + 1
            username = f"std_{sec.school_class.code.lower().replace(' ', '_')}_{sec.name.lower()}_{idx}"
            fn = f"Student_{idx}"
            ln = random.choice(last_names)
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f"{username}@mycbseschool.edu",
                    'first_name': fn,
                    'last_name': ln,
                    'password': make_password('Pass@123'),
                    'school': school,
                    'portal': User.PORTAL_STUDENT
                }
            )
            UserProfile.objects.get_or_create(user=user)
            
            if created or not hasattr(user, 'student_profile'):
                Student.objects.create(
                    user=user,
                    admission_number=f"ADM-{sec.school_class.code.replace(' ', '')}-{sec.name}-{idx:02d}-{random.randint(10,99)}",
                    roll_number=str(idx),
                    academic_year=academic_year,
                    section=sec,
                    admission_date=date.today()
                )
        print(f"   - {cls_name} Section {sec.name}: 20 students ready.")

    print("\n" + "="*50)
    print("DETAILED SEEDING COMPLETE!")
    print("="*50)

if __name__ == "__main__":
    run()
