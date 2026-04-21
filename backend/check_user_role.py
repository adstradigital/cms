import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User

def check_user():
    # Try to find a user that is likely the one the user is logged in as
    # Usually it's the most recently logged in or an admin/canteen staff
    users = User.objects.filter(is_superuser=False).order_by('-last_login')
    for u in users[:5]:
        print(f"User: {u.username}, Role: {u.role.name if u.role else 'None'}, Scope: {u.role.scope if u.role else 'None'}, School: {u.school.name if u.school else 'None'}")

if __name__ == "__main__":
    check_user()
