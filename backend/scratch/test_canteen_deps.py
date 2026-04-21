import os
import django
import sys
import json

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Student
from apps.staff.models import Staff
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

def test_api_responses():
    # Test students search
    from apps.students.views import StudentViewSet
    factory = APIRequestFactory()
    view = StudentViewSet.as_view({'get': 'list'})
    
    # Mocking what the frontend calls: ?search=&ignore_rls=true&paginate=false
    req = factory.get('/api/students/students/', {'search': '', 'ignore_rls': 'true', 'paginate': 'false'})
    
    from apps.accounts.models import User
    user = User.objects.first()
    from rest_framework.test import force_authenticate
    force_authenticate(req, user=user)
    
    try:
        res = view(req)
        print("Student List Response Type:", type(res.data))
        if isinstance(res.data, dict):
            print("Student List Keys:", res.data.keys())
            if 'results' in res.data:
                print("Student Results Count:", len(res.data['results']))
        elif isinstance(res.data, list):
            print("Student List Count:", len(res.data))
        else:
            print("Student Data Sample:", res.data)
    except Exception as e:
        print(f"Student Search Error: {e}")

    # Test staff search
    from apps.staff.views import StaffViewSet
    view = StaffViewSet.as_view({'get': 'list'})
    req = factory.get('/api/staff/staff/', {'search': ''})
    force_authenticate(req, user=user)
    
    try:
        res = view(req)
        print("Staff List Response Type:", type(res.data))
        if isinstance(res.data, dict):
            print("Staff List Keys:", res.data.keys())
        elif isinstance(res.data, list):
            print("Staff List Count:", len(res.data))
    except Exception as e:
        print(f"Staff Search Error: {e}")

if __name__ == "__main__":
    test_api_responses()
