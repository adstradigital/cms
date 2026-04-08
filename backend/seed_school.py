"""
Startup seed script to ensure a Primary School and Academic Year exist.
Run:  python seed_school.py
"""
import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import School, AcademicYear, User

def seed():
    print("============================================================")
    print("  SEEDING SCHOOL & ACADEMIC YEAR")
    print("============================================================")

    # 1. Create or get default school
    school, created = School.objects.get_or_create(
        name="Schoolastica Primary",
        defaults={
            'tagline': "Inspiring Excellence every day.",
            'address': "123 Educational Blvd, Learning City",
            'phone': "+880 1234 567 890",
            'email': "info@schoolastica.edu",
            'website': "https://schoolastica.edu",
            'primary_color': "#00a676",
            'secondary_color': "#3b82f6",
        }
    )
    if created:
        print(f"  SUCCESS Created School: {school.name}")
    else:
        print(f"  UPDATED Existing School: {school.name}")

    # 2. Create or get current academic year
    current_year = date.today().year
    year_name = f"{current_year}-{str(current_year + 1)[2:]}"
    
    academic_year, year_created = AcademicYear.objects.get_or_create(
        school=school,
        name=year_name,
        defaults={
            'start_date': date(current_year, 1, 1),
            'end_date': date(current_year, 12, 31),
            'is_active': True
        }
    )
    if year_created:
        print(f"  SUCCESS Created Academic Year: {academic_year.name}")
    else:
        print(f"  UPDATED Existing Academic Year: {academic_year.name}")
        if not academic_year.is_active:
            academic_year.is_active = True
            academic_year.save()

    # 3. Ensure all superusers belong to this school
    superusers = User.objects.filter(is_superuser=True)
    count = 0
    for user in superusers:
        if not user.school:
            user.school = school
            user.save()
            count += 1
    
    if count > 0:
        print(f"  SUCCESS Linked {count} superusers to {school.name}")

    print("============================================================")
    print("  Done!")

if __name__ == "__main__":
    seed()
