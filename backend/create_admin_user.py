import os
import django
from django.contrib.auth.hashers import make_password

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, School
from apps.permissions.models import Role

def create_admin():
    print("Creating Admin User...")
    
    # 1. Get School
    school = School.objects.first()
    if not school:
        print("Error: No school found. Run seed_school.py first.")
        return
        
    # 2. Get Admin Role
    admin_role = Role.objects.filter(name='Admin').first()
    if not admin_role:
        print("Warning: Admin role not found. This user might have limited access until roles are seeded.")

    # 3. Create Admin User
    username = "admin_test"
    password = "admin123"
    
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': 'admin@example.com',
            'first_name': 'Super',
            'last_name': 'Admin',
            'password': make_password(password),
            'school': school,
            'portal': User.PORTAL_ADMIN,
            'role': admin_role,
            'is_staff': True,
            'is_superuser': True
        }
    )
    
    if not created:
        user.set_password(password)
        user.is_superuser = True
        user.is_staff = True
        user.portal = User.PORTAL_ADMIN
        user.role = admin_role
        user.save()
        print(f"User {username} already exists, updated to Super Admin.")
    else:
        print(f"User {username} created as Super Admin.")

    print("\n" + "="*30)
    print("ADMIN LOGIN CREDENTIALS")
    print(f"URL:      http://localhost:3000/login")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print("="*30)

if __name__ == "__main__":
    create_admin()
