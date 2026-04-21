import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

def fix_db():
    with connection.cursor() as cursor:
        try:
            print("Adding 'category' column to 'hostels' table...")
            cursor.execute("ALTER TABLE hostels ADD COLUMN category varchar(10) NOT NULL DEFAULT 'junior'")
            print("Successfully added column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
