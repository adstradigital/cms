import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User

user = User.objects.filter(username='student_test').first()
if user:
    print(f"User: {user.username}")
    print(f"Portal: {user.portal}")
    print(f"Is Active: {user.is_active}")
    print(f"Check Password (password123): {user.check_password('password123')}")
else:
    print("User 'student_test' not found.")

admin = User.objects.filter(username='admin_test').first()
if admin:
    print(f"Admin: {admin.username}")
    print(f"Portal: {admin.portal}")
    print(f"Is Active: {admin.is_active}")
    print(f"Check Password (admin123): {admin.check_password('admin123')}")
else:
    print("User 'admin_test' not found.")
