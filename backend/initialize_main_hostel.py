import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.models import Hostel, Floor, Room

def initialize():
    print("=" * 60)
    print("  INITIALIZING MAIN HOSTEL DATA")
    print("=" * 60)

    # 1. Get or Create Main Hostel
    hostel, created = Hostel.objects.get_or_create(
        name="Main Hostel",
        defaults={
            'code': 'MAIN-001',
            'gender': 'boys',
            'total_floors': 3,
            'total_capacity': 100,
            'is_active': True
        }
    )
    if not created:
        hostel.total_floors = 3
        hostel.total_capacity = 100
        hostel.save()
        print(f"  [*] Updated Main Hostel capacity.")
    else:
        print(f"  [+] Created Main Hostel.")

    # 2. Create Floors
    for i in range(3):
        floor, f_created = Floor.objects.get_or_create(hostel=hostel, number=i)
        if f_created:
            print(f"  [+] Created Floor {i}")

    # 3. Create Rooms
    room_types = [
        ("single", 1, 5000),
        ("double", 2, 3500),
        ("triple", 3, 2500),
        ("dormitory", 6, 1500),
    ]

    total_created = 0
    for floor_num in range(3):
        floor = Floor.objects.get(hostel=hostel, number=floor_num)
        for room_num in range(1, 11):
            room_id = f"{floor_num}{room_num:02d}"
            # Cyclically pick types
            type_idx = (floor_num + room_num) % len(room_types)
            rtype, cap, rent = room_types[type_idx]

            room, r_created = Room.objects.get_or_create(
                hostel=hostel,
                room_number=room_id,
                defaults={
                    'floor': floor,
                    'room_type': rtype,
                    'capacity': cap,
                    'monthly_rent': rent,
                    'status': 'available'
                }
            )
            if r_created:
                total_created += 1

    print(f"  [+] Created {total_created} new rooms in Main Hostel.")
    print("\n  Data initialization complete.")
    print("=" * 60)

if __name__ == "__main__":
    initialize()
