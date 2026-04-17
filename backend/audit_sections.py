import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Section
from apps.academics.models import SubjectAllocation

sections = Section.objects.all()
print(f"Total Sections: {sections.count()}")
missing_ct = sections.filter(class_teacher__isnull=True)
print(f"Sections missing Class Teacher: {missing_ct.count()}")

for s in missing_ct:
    print(f"- Section ID {s.id}: {s.school_class.name} - {s.name}")

print("\n--- Slot Check for first 5 sections ---")
from apps.accounts.models import AcademicYear
ay = AcademicYear.objects.filter(is_active=True).first()

for s in sections[:5]:
    allocations = SubjectAllocation.objects.filter(section=s, academic_year=ay)
    total_req = sum(a.subject.weekly_periods or 0 for a in allocations)
    print(f"Section {s.name} ({s.id}): Total Required Periods = {total_req}")
