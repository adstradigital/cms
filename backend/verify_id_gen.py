import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms.settings')
django.setup()

from apps.staff.models import Staff

def test_generation():
    print("Testing Employee ID generation...")
    # Get current next ID
    next_id = Staff.generate_next_id()
    print(f"Current next ID: {next_id}")
    
    # Let's see what happens if we had STF005
    # We can't easily fake data in the DB without creating it, so we'll just check current state
    # If no staff exists, it should be STF001
    
test_generation()
