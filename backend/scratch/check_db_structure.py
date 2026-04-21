import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

def check_db():
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables: {tables}")
        
        if 'hostels' in tables:
            cursor.execute("DESCRIBE hostels")
            cols = [c[0] for c in cursor.fetchall()]
            print(f"Hostels columns: {cols}")
            
        if 'hostel_preferences' in tables:
            print("hostel_preferences table EXISTS")
        else:
            print("hostel_preferences table MISSING")

if __name__ == "__main__":
    check_db()
