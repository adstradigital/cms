from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("canteen", "0015_canteenorder_staff"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="ALTER TABLE canteen_food_items DROP COLUMN category_legacy;",
                    reverse_sql="ALTER TABLE canteen_food_items ADD COLUMN category_legacy varchar(20);",
                ),
            ],
            state_operations=[],
        ),
    ]

