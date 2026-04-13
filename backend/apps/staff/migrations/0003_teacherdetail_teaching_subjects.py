from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0009_period_custom_title_alter_period_period_type"),
        ("staff", "0002_parentfeedback_staffleaverequest_stafftask_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacherdetail",
            name="teaching_subjects",
            field=models.ManyToManyField(
                blank=True,
                related_name="teacher_details",
                to="academics.subject",
            ),
        ),
    ]

