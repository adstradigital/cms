import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.students.models import Section
from apps.academics.models import SubjectAllocation

sections = Section.objects.all()
for s in sections:
    print(f"Section: {s.school_class.name if s.school_class else 'N/A'} - {s.name}")
    print(f"  Class Teacher: {s.class_teacher.get_full_name() if s.class_teacher else 'None'}")
    
    allocations = SubjectAllocation.objects.filter(section=s)
    print(f"  Allocations:")
    for a in allocations:
        teachers = [t.get_full_name() for t in a.teachers.all()]
        print(f"    - {a.subject.name}: {teachers}")
    print("-" * 20)
