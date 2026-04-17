import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import AcademicYear

ay = AcademicYear.objects.filter(is_active=True).first()
if ay:
    print(f"Academic Year: {ay.name}")
    print(f"Working Days: {ay.working_days}")
    print(f"Periods Per Day: {ay.periods_per_day}")
    print(f"Break Periods: {ay.break_periods}")
else:
    print("No active academic year found.")
