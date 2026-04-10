import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms.settings')
django.setup()

from apps.accounts.models import User
from apps.students.models import Student, Section

def audit():
    u = User.objects.filter(username='super_admin').first()
    if not u:
        print("User super_admin not found")
        u = User.objects.first()
        print(f"Fallback to first user: {u.username}")

    print(f"User: {u.username}")
    print(f"Is Superuser: {u.is_superuser}")
    print(f"Role: {u.role.name if u.role else 'None'} (Scope: {u.role.scope if u.role else 'None'})")
    print(f"School: {u.school.name if u.school else 'None'}")
    
    # Audit Section 10A
    sec = Section.objects.filter(name='10A').first()
    if sec:
        print(f"\nSection: {sec.name} (ID: {sec.id})")
        print(f"Students in DB: {sec.students.count()}")
        for s in sec.students.all():
             print(f" - {s.user.get_full_name()} (Active: {s.is_active}, AY: {s.academic_year.name if s.academic_year else 'None'})")
             print(f"   School: {s.user.school.name if s.user.school else 'None'}")
    
    # Check what StudentViewSet.get_queryset would return
    qs = Student.objects.all()
    if not (u.is_superuser or (u.role and u.role.scope == 'school')):
        print("\nPOLICY: Restricted view.")
        # Simulating get_accessible_section_ids
        accessible = u.get_accessible_section_ids()
        print(f"Accessible sections: {accessible}")
        qs = qs.filter(section_id__in=accessible)
    else:
        print("\nPOLICY: School-wide view.")
    
    print(f"Final Visibile Students: {qs.count()}")

if __name__ == "__main__":
    audit()
