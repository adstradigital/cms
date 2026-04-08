import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.permissions.models import Role

def test_login_logic_internal():
    print("Testing Login logic for superusers...")
    
    # 1. Setup a superuser without role/portal
    username = "test_super_login"
    User.objects.filter(username=username).delete()
    user = User.objects.create_superuser(username, "test@example.com", "pass123")
    user.role = None
    user.portal = 'admin' # wrong portal
    user.save()
    
    print(f"Initial State: Role={user.role}, Portal={user.portal}")
    
    # Simulate login_view logic
    role, _ = Role.objects.get_or_create(name="super_admin")
    save_needed = False
    if user.role != role:
        user.role = role
        save_needed = True
    if user.portal != User.PORTAL_CREATOR:
        user.portal = User.PORTAL_CREATOR
        save_needed = True
    if save_needed:
        user.save(update_fields=["role", "portal"])
        
    print(f"Final State: Role={user.role.name if user.role else 'None'}, Portal={user.portal}")
    
    if user.role and user.role.name == "super_admin" and user.portal == User.PORTAL_CREATOR:
        print("Superuser mapping successful!")
    else:
        print("Superuser mapping failed!")

if __name__ == "__main__":
    test_login_logic_internal()
