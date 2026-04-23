import os
import django
from django.contrib.auth.hashers import make_password

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User, School
from apps.permissions.models import Role

def seed_repair_users():
    school = School.objects.first()
    if not school:
        print("No school found.")
        return

    admin_role = Role.objects.filter(name='Admin').first()
    principal_role = Role.objects.filter(name='Principal').first()
    teacher_role = Role.objects.filter(name='Subject Teacher').first()

    users_to_create = [
        ('admin', 'Pass@123', 'admin', admin_role, True, True),
        ('admin_user', 'Pass@123', 'admin', admin_role, True, False),
        ('principal_user', 'Pass@123', 'admin', principal_role, True, False),
        ('teacher_sci', 'Pass@123', 'admin', teacher_role, True, False),
        ('teacher_com', 'Pass@123', 'admin', teacher_role, True, False),
    ]

    for uname, pwd, portal, role, is_staff, is_superuser in users_to_create:
        user, created = User.objects.get_or_create(
            username=uname,
            defaults={
                'password': make_password(pwd),
                'school': school,
                'portal': portal,
                'role': role,
                'is_staff': is_staff,
                'is_superuser': is_superuser,
                'email': f"{uname}@example.com"
            }
        )
        if not created:
            user.set_password(pwd)
            user.portal = portal
            user.role = role
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()
            print(f"Updated user: {uname}")
        else:
            print(f"Created user: {uname}")

if __name__ == "__main__":
    seed_repair_users()
