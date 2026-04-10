import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.students.models import Section, Class
from apps.permissions.models import Role

def verify():
    print("Verifying Special Class Teacher role logic...")
    
    # 1. Setup a test teacher
    username = "test_logic_teacher"
    user, _ = User.objects.get_or_create(username=username, defaults={'portal': 'admin'})
    
    # Assign Subject Teacher role (which lacks attendance.mark)
    st_role = Role.objects.get(name='Subject Teacher')
    user.role = st_role
    user.save()
    
    print(f"  User: {username}, Role: {user.role.name}")
    print(f"  Permission 'attendance.mark' should be False: {user.has_perm_code('attendance.mark')}")
    
    # 2. Assign as class teacher of a section
    section = Section.objects.first()
    if not section:
        print("  [!] Error: No sections found to test with.")
        return
        
    print(f"  Assigning user as class teacher of {section}...")
    section.class_teacher = user
    section.save()
    
    # 3. Re-check permission
    print(f"  Permission 'attendance.mark' should now be True: {user.has_perm_code('attendance.mark')}")
    
    # Cleanup
    section.class_teacher = None
    section.save()
    user.delete()
    print("Verification complete and cleaned up.")

if __name__ == "__main__":
    verify()
