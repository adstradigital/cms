import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.models import Hostel, Room, RoomAllotment, StudentHostelPreference
from apps.hostel.views import auto_assign_view
from rest_framework.test import APIRequestFactory
from apps.accounts.models import User
from apps.students.models import Student

def test_allocation():
    print("=" * 60)
    print("  TESTING INTELLIGENT ALLOCATION SYSTEM")
    print("=" * 60)

    # Find a junior boy (let's say a male student in grade 5)
    junior_boy = Student.objects.filter(
        section__school_class__name__icontains="Grade 5",
        user__profile__gender="Male"
    ).first()

    # Find a junior girl
    junior_girl = Student.objects.filter(
        section__school_class__name__icontains="Grade 5",
        user__profile__gender="Female"
    ).first()
    
    # Another junior boy from Grade 5 to test grouping
    another_junior_boy = Student.objects.filter(
        section__school_class__name__icontains="Grade 5",
        user__profile__gender="Male"
    ).exclude(id=junior_boy.id).first()

    if not junior_boy or not junior_girl or not another_junior_boy:
        print("Could not find required test students.")
        return

    print(f"Junior Boy 1: {junior_boy.user.get_full_name()} (Grade 5)")
    print(f"Junior Boy 2: {another_junior_boy.user.get_full_name()} (Grade 5)")
    print(f"Junior Girl: {junior_girl.user.get_full_name()} (Grade 5)")

    factory = APIRequestFactory()
    user = User.objects.get(username='admin_user')

    # Assign Boy 1 to Junior Mixed
    StudentHostelPreference.objects.update_or_create(
        student=junior_boy,
        defaults={"preferred_hostel_type": "mixed"}
    )
    request1 = factory.post('/api/hostel/auto-assign/', {'student': junior_boy.id}, format='json')
    request1.user = user
    response1 = auto_assign_view(request1)
    
    if response1.status_code == 201:
        print(f"\n[+] Boy 1 Allocated to: {response1.data['hostel_name']} Room {response1.data['room_number']}")
        room_id = response1.data['room']
    else:
        print(f"\n[-] Boy 1 Allocation Failed: {response1.data}")
        return

    # Try assigning Girl to same room via standard allocation (Should fail to be in the same room)
    StudentHostelPreference.objects.update_or_create(
        student=junior_girl,
        defaults={"preferred_hostel_type": "mixed"}
    )
    request2 = factory.post('/api/hostel/auto-assign/', {'student': junior_girl.id}, format='json')
    request2.user = user
    response2 = auto_assign_view(request2)

    if response2.status_code == 201:
        print(f"[+] Girl Allocated to: {response2.data['hostel_name']} Room {response2.data['room_number']}")
        if response2.data['room'] == room_id:
            print("  [!] FAIL: Gender Isolation Broken. Girl placed in boy's room.")
        else:
            print("  [*] PASS: Gender Isolation Enforced.")
    else:
        print(f"[-] Girl Allocation Failed (This is fine if no other mixed rooms available): {response2.data}")


if __name__ == "__main__":
    test_allocation()
