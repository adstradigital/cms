from django.db import migrations


LEGACY_CATEGORY_NAMES = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "snacks": "Snacks",
    "dinner": "Dinner",
    "juice": "Juice",
    "other": "Other",
}


def _normalize_category_name(raw_value):
    text = str(raw_value or "").strip()
    if not text:
        return "Other"

    normalized = text.lower().replace("_", " ").strip()
    if normalized in LEGACY_CATEGORY_NAMES:
        return LEGACY_CATEGORY_NAMES[normalized]

    return " ".join(word.capitalize() for word in normalized.split())


def backfill_fooditem_categories(apps, schema_editor):
    FoodCategory = apps.get_model("canteen", "FoodCategory")
    connection = schema_editor.connection

    existing_category_ids = set(FoodCategory.objects.values_list("id", flat=True))
    category_name_to_id = {
        category.name.lower(): category.id
        for category in FoodCategory.objects.all()
    }

    def ensure_category_id(name):
        key = name.lower()
        existing_id = category_name_to_id.get(key)
        if existing_id:
            return existing_id

        category = FoodCategory.objects.create(name=name, description="")
        category_name_to_id[key] = category.id
        existing_category_ids.add(category.id)
        return category.id

    with connection.cursor() as cursor:
        cursor.execute("SELECT id, category_id FROM canteen_food_items")
        food_item_rows = cursor.fetchall()

    updates = []
    for item_id, raw_category in food_item_rows:
        if raw_category in existing_category_ids:
            continue

        raw_text = str(raw_category or "").strip()
        if raw_text.isdigit():
            numeric_category_id = int(raw_text)
            if numeric_category_id in existing_category_ids:
                target_category_id = numeric_category_id
            else:
                target_category_id = ensure_category_id("Other")
        else:
            target_category_id = ensure_category_id(_normalize_category_name(raw_text))

        updates.append((target_category_id, item_id))

    if updates:
        with connection.cursor() as cursor:
            cursor.executemany(
                "UPDATE canteen_food_items SET category_id = %s WHERE id = %s",
                updates,
            )


class Migration(migrations.Migration):

    dependencies = [
        ("canteen", "0013_alter_fooditem_category"),
    ]

    operations = [
        migrations.RunPython(backfill_fooditem_categories, migrations.RunPython.noop),
    ]
