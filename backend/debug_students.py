import os, django
from django.test import RequestFactory
from rest_framework.request import Request

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Section, Student
from apps.accounts.models import User
from apps.students.views import StudentViewSet

def debug_students():
    # Try Om Nair first, fallback to first user if needed
    user = User.objects.filter(first_name='Om', last_name='Nair').first()
    if not user:
        user = User.objects.filter(is_superuser=True).first()
    
    if not user:
        print("User not found")
        return

    print(f"Executing as User: {user.username} (Role: {user.role.name if user.role else 'None'})")

    sec = Section.objects.filter(school_class__name='Grade 1', name='A').first()
    if not sec:
        print("Section Grade 1 A not found")
        return

    print(f"Checking for Section ID: {sec.id} ({sec})")
    print(f"Total students in DB for this section: {Student.objects.filter(section=sec).count()}")
    print(f"Active students in DB for this section: {Student.objects.filter(section=sec, is_active=True).count()}")

    # Simulate request
    factory = RequestFactory()
    url = f'/api/students/students/?section={sec.id}&academic_year=2025-26&is_active=true'
    wsgi_request = factory.get(url)
    wsgi_request.user = user
    
    # Wrap in DRF Request
    drf_request = Request(wsgi_request)
    drf_request.user = user  # Critical: Set user on DRF Request
    
    view = StudentViewSet()
    view.request = drf_request
    view.action = 'list'
    view.format_kwarg = None
    
    qs = view.get_queryset()
    print(f"Queryset count: {qs.count()}")
    if qs.count() == 0:
        print("SQL Query conducted:")
        print(qs.query)
        
        # Check accessible sections
        accessible = admin.get_accessible_section_ids()
        print(f"Admin accessible section IDs: {accessible}")
        
    for student in qs[:5]:
        print(f"Student: {student.admission_number} - {student.user.get_full_name()} (Active: {student.is_active})")

if __name__ == '__main__':
    debug_students()
