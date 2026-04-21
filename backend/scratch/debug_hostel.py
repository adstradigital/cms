import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.models import Hostel
from apps.hostel.serializers import HostelSerializer
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

def debug_hostel_view():
    from apps.hostel.views import hostel_list_view
    factory = APIRequestFactory()
    request = factory.get('/api/hostel/')
    
    # We need a user for IsAuthenticated
    from apps.accounts.models import User
    user = User.objects.first()
    from rest_framework.test import force_authenticate
    
    view = hostel_list_view
    req = factory.get('/api/hostel/')
    force_authenticate(req, user=user)
    
    try:
        response = view(req)
        print(f"Status Code: {response.status_code}")
        print(f"Response Data: {response.data}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_hostel_view()
