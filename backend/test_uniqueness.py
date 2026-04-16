import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.students.models import Section
from apps.accounts.models import User
from django.db.utils import IntegrityError

# Get two sections and one teacher
sections = Section.objects.all()[:2]
teacher = User.objects.filter(is_staff=True).first()

if len(sections) < 2 or not teacher:
    print("Not enough data to test.")
    sys.exit()

print(f"Attempting to assign Teacher {teacher.get_full_name()} to two different sections...")

try:
    s1 = sections[0]
    s1.class_teacher = teacher
    s1.save()
    print(f"Section 1 ({s1.name}) assigned successfully.")
    
    s2 = sections[1]
    s2.class_teacher = teacher
    s2.save() # This should fail
    print("FAILURE: System allowed double class-teacher assignment!")
except IntegrityError:
    print("SUCCESS: System prevented double class-teacher assignment as expected.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    # Cleanup
    for s in sections:
        s.class_teacher = None
        s.save()
