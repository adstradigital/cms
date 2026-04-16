import os, django
from django.db.models import Count

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Section, Student
from apps.accounts.models import AcademicYear, School

def audit_data():
    print("--- Database Audit ---")
    
    # 1. Academic Years
    print("\nAcademic Years:")
    for ay in AcademicYear.objects.all():
        print(f"ID: {ay.id}, Name: {ay.name}, Active: {ay.is_active}, School: {ay.school.name}")

    # 2. Student Distribution
    print("\nStudent Distribution by Class, Section, and AY:")
    results = Student.objects.values(
        'section__school_class__name', 
        'section__name', 
        'academic_year__name',
        'is_active'
    ).annotate(count=Count('id')).order_by('section__school_class__name', 'section__name')
    
    for r in results:
        print(f"Class: {r['section__school_class__name']}, Sec: {r['section__name']}, AY: {r['academic_year__name']}, Active: {r['is_active']}, Count: {r['count']}")

    # 3. Check for students without academic year or section
    missing_ay = Student.objects.filter(academic_year__isnull=True).count()
    missing_sec = Student.objects.filter(section__isnull=True).count()
    print(f"\nStudents missing AY: {missing_ay}")
    print(f"Students missing Section: {missing_sec}")

    # 4. Check School Mismatch
    # Student -> User -> School vs Student -> Section -> Class -> School
    print("\nChecking for School Mismatches:")
    mismatches = 0
    for student in Student.objects.select_related('user', 'section__school_class__school').all():
        if student.section and student.user.school != student.section.school_class.school:
            mismatches += 1
            if mismatches <= 5:
                print(f"Student {student.admission_number}: User School ({student.user.school}) != Section School ({student.section.school_class.school})")
    print(f"Total School Mismatches: {mismatches}")

if __name__ == '__main__':
    audit_data()
