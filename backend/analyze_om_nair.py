import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.accounts.models import User
from apps.academics.models import Period, Timetable

user = User.objects.filter(first_name='Om', last_name='Nair').first()
if not user:
    print("Teacher Om Nair not found.")
    sys.exit()

print(f"Schedule for {user.get_full_name()}:")
periods = Period.objects.filter(teacher=user).select_related('timetable__section', 'timetable__section__school_class').order_by('timetable__day_of_week', 'period_number')

for p in periods:
    day_name = p.timetable.get_day_of_week_display()
    section_name = f"{p.timetable.section.school_class.name} {p.timetable.section.name}"
    print(f" - {day_name} P{p.period_number}: {section_name}")

# Check for clashes in Period 1 specifically
print("\nPeriod 1 Assignments for Om Nair:")
p1_periods = Period.objects.filter(teacher=user, period_number=1).select_related('timetable__section', 'timetable__section__school_class').order_by('timetable__day_of_week')
for p in p1_periods:
    day_name = p.timetable.get_day_of_week_display()
    section_name = f"{p.timetable.section.school_class.name} {p.timetable.section.name}"
    print(f" - {day_name}: {section_name}")
