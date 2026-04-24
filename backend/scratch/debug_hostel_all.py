import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.views import room_list_view, allotment_list_view, hostel_fee_list_view
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from apps.accounts.models import User
from rest_framework.test import force_authenticate

def debug_views():
    factory = APIRequestFactory()
    user = User.objects.first()
    
    views = [
        ('/api/hostel/rooms/', room_list_view),
        ('/api/hostel/allotments/', allotment_list_view),
        ('/api/hostel/fees/', hostel_fee_list_view)
    ]
    
    for url, view in views:
        print(f"Testing {url}...")
        req = factory.get(url)
        force_authenticate(req, user=user)
        try:
            response = view(req)
            print(f"Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"Response Data: {response.data}")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_views()
