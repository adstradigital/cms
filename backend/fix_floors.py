import os
import django
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.models import Hostel, Floor

def fix_missing_floors():
    with transaction.atomic():
        hostels = Hostel.objects.all()
        for hostel in hostels:
            existing_floors = list(hostel.floors.values_list('number', flat=True))
            print(f"Checking Hostel {hostel.name} (Total: {hostel.total_floors}, Existing: {existing_floors})")
            for i in range(hostel.total_floors):
                if i not in existing_floors:
                    Floor.objects.create(hostel=hostel, number=i)
                    print(f" - Created floor {i}")

if __name__ == "__main__":
    fix_missing_floors()
