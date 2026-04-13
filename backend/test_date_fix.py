import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.hostel.serializers import RoomAllotmentSerializer
from django.utils import timezone

print(f"Current localdate: {timezone.localdate()}")
print(f"Current now: {timezone.now()}")

# Simulate a POST request without join_date
data = {'student': 1, 'room': 1}
serializer = RoomAllotmentSerializer(data=data)
if serializer.is_valid():
    print(f"Validation successful!")
    print(f"Validated join_date: {serializer.validated_data.get('join_date')} (Type: {type(serializer.validated_data.get('join_date'))})")
else:
    print(f"Validation failed!")
    print(f"Errors: {serializer.errors}")
