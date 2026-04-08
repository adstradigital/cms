import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, School, UserProfile
from apps.accounts.serializers import SchoolOnboardingSerializer
from apps.permissions.models import Role
from django.db import transaction

def test_onboarding():
    print("Testing School Onboarding logic...")
    
    # Cleanup previous tests
    User.objects.filter(username="alpha_admin").delete()
    School.objects.filter(name="Test School Alpha").delete()
    
    data = {
        "school_name": "Test School Alpha",
        "admin_username": "alpha_admin",
        "admin_email": "admin@testschool.com",
        "admin_password": "AdminPassword123!",
        "admin_first_name": "Alpha",
        "admin_last_name": "Admin"
    }

    serializer = SchoolOnboardingSerializer(data=data)
    if serializer.is_valid():
        result = serializer.save()
        print("Onboarding successful!")
        
        school = result['school']
        admin = result['admin']
        
        print(f"School created: {school.name} (id: {school.id})")
        print(f"Admin created: {admin.username} (id: {admin.id})")
        print(f"Admin Portal: {admin.portal}")
        print(f"Admin Role: {admin.role.name if admin.role else 'None'}")
        print(f"Admin School: {admin.school.name}")
        
        # Verify Profile
        profile = UserProfile.objects.filter(user=admin).first()
        print(f"Admin Profile created: {'Yes' if profile else 'No'}")
        
    else:
        print(f"Validation failed: {serializer.errors}")

if __name__ == "__main__":
    test_onboarding()
