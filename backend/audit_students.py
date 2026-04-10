import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms.settings')
django.setup()

from apps.accounts.models import User, Role
from apps.students.models import Student, Section

def audit():
    print("--- User Audit ---")
    u = User.objects.filter(username__in=['admin', 'alpha']).first()
    if u:
        print(f"User: {u.username}")
        print(f"Is Superuser: {u.is_superuser}")
        print(f"Role: {u.role.name if u.role else 'None'} (Scope: {u.role.scope if u.role else 'None'})")
        print(f"School: {u.school.name if u.school else 'None'}")
    
    print("\n--- Section Audit ---")
    # Find Section 10A
    sec_10a = Section.objects.filter(name='10A').first()
    if sec_10a:
        print(f"Section 10A (ID: {sec_10a.id})")
        print(f"Class: {sec_10a.school_class.name}")
        print(f"Student Count (DB): {sec_10a.students.count()}")
        
        # Check students
        for s in sec_10a.students.all():
            print(f" - Student: {s.user.get_full_name()} (Active: {s.is_active}, Year: {s.academic_year.name}, School: {s.user.school.name})")
    else:
        print("Section 10A not found!")

    print("\n--- Accessible Sections check ---")
    if u:
        # Simulate the check in views.py
        if u.is_superuser or (u.role and u.role.scope == 'school'):
            print("Access allowed: Superuser or School Scope")
        else:
            # Check get_accessible_section_ids
            # We don't have the method easily, but let's check class_teacher relationship
            managed = Section.objects.filter(class_teacher=u).count()
            print(f"Managed Sections count: {managed}")

if __name__ == "__main__":
    audit()
