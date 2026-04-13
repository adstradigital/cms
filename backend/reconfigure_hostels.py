import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.models import Hostel, Floor, Room

def initialize():
    print("=" * 60)
    print("  CONFIGURING 6 INTELLIGENT HOSTELS")
    print("=" * 60)

    hostels_config = [
        {"name": "Junior Boys Hostel", "code": "JB-001", "gender": "boys", "category": "junior"},
        {"name": "Senior Boys Hostel", "code": "SB-001", "gender": "boys", "category": "senior"},
        {"name": "Junior Girls Hostel", "code": "JG-001", "gender": "girls", "category": "junior"},
        {"name": "Senior Girls Hostel", "code": "SG-001", "gender": "girls", "category": "senior"},
        {"name": "Junior Mixed Hostel", "code": "JM-001", "gender": "mixed", "category": "junior"},
        {"name": "Senior Mixed Hostel", "code": "SM-001", "gender": "mixed", "category": "senior"},
    ]

    for config in hostels_config:
        hostel, created = Hostel.objects.get_or_create(
            name=config["name"],
            defaults={
                'code': config["code"],
                'gender': config["gender"],
                'category': config["category"],
                'total_floors': 3,
                'total_capacity': 100,
                'is_active': True
            }
        )
        
        if not created:
            # Update just in case
            hostel.gender = config["gender"]
            hostel.category = config["category"]
            hostel.total_floors = 3
            hostel.total_capacity = 100
            hostel.save()
            print(f"  [*] Updated {hostel.name}.")
        else:
            print(f"  [+] Created {hostel.name}.")

        # Create Floors and Rooms
        for floor_num in range(3):
            floor, f_created = Floor.objects.get_or_create(hostel=hostel, number=floor_num)
            
            # Create a mix of rooms per floor (single, double, triple, dorm)
            room_types = [
                ("single", 1, 5000),
                ("double", 2, 3500),
                ("triple", 3, 2500),
                ("dormitory", 6, 1500),
            ]
            
            for room_num in range(1, 6):
                room_id = f"{floor_num}{room_num:02d}"
                type_idx = (floor_num + room_num) % len(room_types)
                rtype, cap, rent = room_types[type_idx]

                Room.objects.get_or_create(
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

    print("\n  Data initialization complete.")
    print("=" * 60)

if __name__ == "__main__":
    initialize()
