import os, django
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.students.views import StudentViewSet
from apps.accounts.models import User
from apps.students.models import Section

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_api():
    admin = User.objects.filter(is_superuser=True).first()
    sec_1_a = Section.objects.filter(school_class__name='Grade 1', name='A').first()
    sec_11_a = Section.objects.filter(school_class__name='Grade 11', name='A').first()
    
    factory = APIRequestFactory()
    view = StudentViewSet.as_view({'get': 'list'})

    def check_sec(name, sec, user):
        print(f"\n--- Checking {name} (ID: {sec.id}) as {user.username} ---")
        request = factory.get(f'/api/students/students/?section={sec.id}&academic_year=2025-26&is_active=true')
        force_authenticate(request, user=user)
        response = view(request)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            count = response.data.get('count', len(response.data))
            print(f"Count: {count}")
            # If paginated, check first item
            results = response.data.get('results', [])
            if results:
                print(f"First result: {results[0].get('admission_number')} - {results[0].get('user').get('first_name')}")
            else:
                print("Results list is EMPTY")
        else:
            print(f"Error: {response.data}")

    if sec_1_a:
        check_sec("Grade 1 A", sec_1_a, admin)
        # Find Om Nair
        om = User.objects.filter(first_name='Om', last_name='Nair').first()
        if om:
            check_sec("Grade 1 A", sec_1_a, om)
    
    if sec_11_a:
        check_sec("Grade 11 A", sec_11_a, admin)

if __name__ == '__main__':
    test_api()
