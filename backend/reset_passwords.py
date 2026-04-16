import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User

admin = User.objects.filter(is_superuser=True).first()
if admin:
    admin.set_password('Admin@1234')
    admin.save()
    print(f"SuperAdmin Username: {admin.username}")
    print(f"SuperAdmin Password updated to: Admin@1234")

om = User.objects.filter(first_name__iexact='om', last_name__iexact='nair').first()
if om:
    om.set_password('Teacher@1234')
    om.save()
    print(f"Teacher Username: {om.username}")
    print(f"Teacher Password updated to: Teacher@1234")

print('Passwords reset successfully!')
