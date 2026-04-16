import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.library.models import LibrarySetting

def initialize_library_settings():
    settings = [
        {
            'config_key': 'fine_rate_per_day',
            'value': '5',
            'description': 'Fine amount in INR to be charged per day for overdue books after the grace period.'
        },
        {
            'config_key': 'grace_period_days',
            'value': '2',
            'description': 'Number of days after the due date before fines start accumulating.'
        },
        {
            'config_key': 'student_max_books',
            'value': '3',
            'description': 'Maximum number of books a student can borrow at one time.'
        }
    ]

    for s in settings:
        obj, created = LibrarySetting.objects.get_or_create(
            config_key=s['config_key'],
            defaults={'value': s['value'], 'description': s['description']}
        )
        if not created:
            print(f"Setting {s['config_key']} already exists.")
        else:
            print(f"Created setting {s['config_key']}.")

if __name__ == "__main__":
    initialize_library_settings()
