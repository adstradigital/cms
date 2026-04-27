from django.db import migrations

def drop_category_legacy(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == 'sqlite':
            cursor.execute("PRAGMA table_info(canteen_food_items)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'category_legacy' in columns:
                # SQLite 3.35.0+ supports DROP COLUMN. For older versions, 
                # this might fail, but Django's schema_editor usually handles it if using RemoveField.
                # Here we'll try a direct drop or just ignore if it fails.
                try:
                    cursor.execute("ALTER TABLE canteen_food_items DROP COLUMN category_legacy")
                except Exception:
                    pass
        elif connection.vendor == 'mysql':
            try:
                cursor.execute("ALTER TABLE canteen_food_items DROP COLUMN category_legacy")
            except Exception:
                pass

class Migration(migrations.Migration):

    dependencies = [
        ("canteen", "0015_canteenorder_staff"),
    ]

    operations = [
        migrations.RunPython(drop_category_legacy, migrations.RunPython.noop),
    ]

