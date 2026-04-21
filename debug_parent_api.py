import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import Parent
from apps.students.models import Student

User = get_user_model()

def debug_parent():
    client = APIClient()
    username = 'parent_test'
    password = 'parent123'
    
    print(f"--- Debugging Parent Portal for user: {username} ---")
    
    try:
        user = User.objects.get(username=username)
        print(f"User found: {user.id}, Portal: {user.portal}")
        
        parent = getattr(user, 'parent_profile', None)
        if not parent:
            print("ERROR: parent_profile NOT FOUND on user object!")
            return
            
        print(f"Parent Profile found: {parent.id}")
        children = parent.students.all()
        print(f"Linked Children: {children.count()}")
        for child in children:
            print(f" - Student: {child.user.username} (ID: {child.id}), Section: {child.section}")

        # Simulate API calls
        client.force_authenticate(user=user)
        
        print("\n1. Testing GET /api/accounts/parent/stats/")
        res = client.get('/api/accounts/parent/stats/')
        print(f"Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Error Content: {res.content}")
            
        print("\n2. Testing GET /api/accounts/parent/children/")
        res = client.get('/api/accounts/parent/children/')
        print(f"Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Error Content: {res.content}")
        else:
            print(f"Children returned: {len(res.data)}")

        if children.exists():
            child_id = children.first().id
            print(f"\n3. Testing GET /api/accounts/parent/child/{child_id}/progress/")
            res = client.get(f'/api/accounts/parent/child/{child_id}/progress/')
            print(f"Status: {res.status_code}")
            if res.status_code != 200:
                print(f"Error Content: {res.content}")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_parent()
