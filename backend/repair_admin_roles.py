import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.permissions.models import Role

def repair():
    print("=" * 60)
    print("  REPAIRING ADMIN PORTAL USERS")
    print("=" * 60)

    # 1. Fetch Roles
    try:
        admin_role = Role.objects.get(name='Admin')
        principal_role = Role.objects.get(name='Principal')
        teacher_role = Role.objects.get(name='Subject Teacher')
    except Role.DoesNotExist as e:
        print(f"  [!] Error: Required role not found: {e}")
        return

    # 2. Update Admin Superuser
    try:
        admin = User.objects.get(username='admin')
        admin.set_password('Pass@123')
        admin.role = admin_role
        admin.portal = 'admin'
        admin.save()
        print(f"  [+] Repaired superuser 'admin': password set to Pass@123, role set to Admin")
    except User.DoesNotExist:
        print(f"  [!] User 'admin' not found.")

    # 3. Update admin_user
    try:
        u = User.objects.get(username='admin_user')
        u.set_password('Pass@123')
        u.role = admin_role
        u.portal = 'admin'
        u.save()
        print(f"  [+] Repaired 'admin_user': password set to Pass@123, role set to Admin")
    except User.DoesNotExist:
        print(f"  [!] User 'admin_user' not found.")

    # 4. Update principal_user
    try:
        u = User.objects.get(username='principal_user')
        u.set_password('Pass@123')
        u.role = principal_role
        u.portal = 'admin'
        u.save()
        print(f"  [+] Repaired 'principal_user': password set to Pass@123, role set to Principal")
    except User.DoesNotExist:
        print(f"  [!] User 'principal_user' not found.")

    # 5. Update teachers
    for uname in ['teacher_sci', 'teacher_com']:
        try:
            u = User.objects.get(username=uname)
            u.set_password('Pass@123')
            u.role = teacher_role
            u.portal = 'admin'
            u.save()
            print(f"  [+] Repaired '{uname}': password set to Pass@123, role set to Subject Teacher")
        except User.DoesNotExist:
            print(f"  [!] User '{uname}' not found.")

    print("\n  All repairs complete. Please try logging in now.")
    print("=" * 60)

if __name__ == "__main__":
    repair()
