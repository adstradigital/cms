from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("hostel", "0002_hostel_total_capacity"),
    ]

    operations = [
        migrations.AddField(
            model_name="hostelfee",
            name="room_rent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="hostelfee",
            name="electricity_charges",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="hostelfee",
            name="mess_fee",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
