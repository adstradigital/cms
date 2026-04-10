import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def cleanup():
    with connection.cursor() as cursor:
        # Drop old tables if they exist
        tables_to_drop = [
            'hostel_allotments',
            'hostel_rooms',
            'hostel_blocks',
            'room_allotments',
            'room_transfers',
            'night_attendance',
            'entry_exit_logs',
            'hostel_violations',
            'visitor_logs',
            'hostel_fees',
            'hostels',
            'hostel_floors'
        ]
        
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table};")
                print(f"Dropped {table}")
            except Exception as e:
                print(f"Error dropping {table}: {e}")
        
        # Clear migration history for hostel
        try:
            cursor.execute("DELETE FROM django_migrations WHERE app = 'hostel';")
            print("Cleared migration history for 'hostel'")
        except Exception as e:
            print(f"Error clearing migration history: {e}")
            
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

if __name__ == "__main__":
    cleanup()
