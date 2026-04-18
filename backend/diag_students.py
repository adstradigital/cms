import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.students.models import Student
from django.db.models import Count

def diag():
    admin = User.objects.filter(is_superuser=True).first()
    print(f"Total Students: {Student.objects.count()}")
    print(f"Active Students: {Student.objects.filter(is_active=True).count()}")
    
    # Check current school distribution
    for school in Student.objects.values('user__school__name').annotate(c=Count('id')):
        print(f"School: {school['user__school__name']} -> {school['c']} students")
        
    # Check a sample of students and their names
    print("\nSample Students:")
    for s in Student.objects.all().order_by('roll_number', 'user__last_name')[:10]:
        print(f"ID: {s.admission_number}, Roll: {s.roll_number}, Name: {s.user.get_full_name()}, School: {s.user.school.name if s.user.school else 'None'}")

if __name__ == "__main__":
    diag()
