import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.permissions.models import Permission, Role
from apps.accounts.models import User

def seed():
    # 1. Create Permissions
    perms = [
        ('students.view', 'View Student Directory'),
        ('students.edit', 'Register/Edit Students'),
        ('attendance.view', 'View Attendance'),
        ('attendance.write', 'Mark Attendance'),
        ('exams.view', 'View Exam Results'),
        ('fees.view', 'View Fee Status'),
    ]
    
    perm_objs = {}
    for code, label in perms:
        obj, _ = Permission.objects.get_or_create(codename=code, defaults={'label': label})
        perm_objs[code] = obj
        print(f"Permission created: {code}")

    # 2. Create Roles
    roles = [
        ('Admin', False, [p for p in perm_objs.values()]),
        ('Class Teacher', False, [
            perm_objs['students.view'], 
            perm_objs['attendance.view'], 
            perm_objs['attendance.write']
        ]),
        ('Subject Teacher', False, [
            perm_objs['attendance.view'], 
            perm_objs['attendance.write']
        ]),
        ('Accountant', False, [perm_objs['fees.view']]),
    ]

    for name, custom, role_perms in roles:
        role, created = Role.objects.get_or_create(name=name, defaults={'is_custom': custom})
        role.permissions.set(role_perms)
        print(f"Role {'created' if created else 'updated'}: {name}")

    # 3. Assign Admin role to superuser if exists
    admin_role = Role.objects.get(name='Admin')
    for user in User.objects.filter(is_superuser=True):
        user.role = admin_role
        user.portal = User.PORTAL_ADMIN
        user.save()
        print(f"Assigned Admin role to superuser: {user.username}")

if __name__ == '__main__':
    seed()
