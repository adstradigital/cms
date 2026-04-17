import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.library.models import Book, Rack, Shelf, LibrarySetting
from apps.students.models import Student
from apps.staff.models import Staff

def seed_library():
    print("Starting Library Seeding...")

    # 1. Create Settings
    settings = [
        ('fine_rate_per_day', '5', 'Daily fine amount for overdue books.'),
        ('issue_duration_days', '14', 'Default borrowing duration in days.'),
        ('student_borrow_limit', '3', 'Max books a student can borrow.')
    ]
    for key, val, desc in settings:
        LibrarySetting.objects.get_or_create(config_key=key, defaults={'value': val, 'description': desc})

    # 2. Create Racks and Shelves
    racks_data = [
        {'name': 'Science Section', 'code': 'SCI-01', 'location': 'First Floor, North Wing'},
        {'name': 'Literature', 'code': 'LIT-02', 'location': 'First Floor, East Wing'},
        {'name': 'Reference', 'code': 'REF-03', 'location': 'Ground Floor, Main Hall'}
    ]

    for rd in racks_data:
        rack, created = Rack.objects.get_or_create(code=rd['code'], defaults={'name': rd['name'], 'location': rd['location']})
        if created:
            for i in range(1, 4):
                Shelf.objects.create(rack=rack, name=f'Shelf {i}', code=f"{rd['code']}-S{i}")

    # 3. Create Books
    shelves = list(Shelf.objects.all())
    books_data = [
        {'title': 'Brief History of Time', 'author': 'Stephen Hawking', 'category': 'Science', 'isbn': '978-0553380163'},
        {'title': 'The Great Gatsby', 'author': 'F. Scott Fitzgerald', 'category': 'Literature', 'isbn': '978-0743273565'},
        {'title': 'Cosmos', 'author': 'Carl Sagan', 'category': 'Science', 'isbn': '978-0345331359'},
        {'title': 'Clean Code', 'author': 'Robert C. Martin', 'category': 'Technology', 'isbn': '978-0132350884'},
        {'title': 'The Alchemist', 'author': 'Paulo Coelho', 'category': 'Fiction', 'isbn': '978-0062315007'},
        {'title': 'Oxford English Dictionary', 'author': 'Oxford', 'category': 'Reference', 'isbn': '978-0199573158'}
    ]

    for bd in books_data:
        shelf = random.choice(shelves)
        Book.objects.get_or_create(
            title=bd['title'],
            defaults={
                'author': bd['author'],
                'category': bd['category'],
                'isbn': bd['isbn'],
                'total_copies': 5,
                'available_copies': 5,
                'shelf': shelf,
                'publisher': 'Academic Press',
                'year': '2020'
            }
        )

    print("Library Seeding Completed Successfully!")

if __name__ == '__main__':
    seed_library()
