import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.db.models import Count
from apps.students.models import Section

duplicates = Section.objects.values('class_teacher').annotate(count=Count('id')).filter(count__gt=1, class_teacher__isnull=False)

print("Teachers managing multiple sections:")
for d in duplicates:
    from apps.accounts.models import User
    user = User.objects.get(id=d['class_teacher'])
    sections = Section.objects.filter(class_teacher=user)
    print(f" - {user.get_full_name()} (ID: {user.id}) is class teacher for {len(sections)} sections:")
    for s in sections:
        print(f"    * {s.school_class.name} - {s.name}")

if not duplicates:
    print("No duplicates found.")
