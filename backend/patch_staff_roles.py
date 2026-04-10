import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.permissions.models import Role

def patch_roles():
    print("Assigning default roles to sample staff...")
    
    # Map usernames/designations to Role names
    mapping = {
        'principal_user': 'Principal',
        'admin_user': 'Admin',
        'teacher_sci': 'Class Teacher',
        'teacher_com': 'Subject Teacher',
    }
    
    for username, role_name in mapping.items():
        try:
            user = User.objects.get(username=username)
            role = Role.objects.get(name=role_name)
            user.role = role
            user.save()
            print(f"  [+] Assigned '{role_name}' to user: {username}")
        except Exception as e:
            print(f"  [!] Failed for {username}: {e}")

if __name__ == "__main__":
    patch_roles()
