import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.db import connection
from django.apps import apps

def fix_schema():
    existing_tables = connection.introspection.table_names()
    with connection.schema_editor() as schema_editor:
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if model._meta.proxy or model._meta.auto_created:
                    continue
                db_table = model._meta.db_table
                if db_table not in existing_tables:
                    print(f"Creating table for {model._meta.object_name} ({db_table})")
                    try:
                        schema_editor.create_model(model)
                        print(f"  -> Created {db_table}")
                        existing_tables.append(db_table)
                    except Exception as e:
                        print(f"Error creating {db_table}: {e}")
                else:
                    # Table exists, check fields
                    with connection.cursor() as cursor:
                        table_description = connection.introspection.get_table_description(cursor, db_table)
                        existing_columns = [col.name for col in table_description]
                    
                    for field in model._meta.local_fields:
                        column_name = field.column
                        if column_name not in existing_columns:
                            print(f"Missing column {column_name} in {db_table}")
                            try:
                                schema_editor.add_field(model, field)
                                print(f"  -> Added {column_name}")
                            except Exception as e:
                                print(f"Error adding {column_name}: {e}")
                                
                    # Also many-to-many
                    for field in model._meta.local_many_to_many:
                        m2m_table = field.m2m_db_table()
                        if m2m_table not in existing_tables:
                            print(f"Creating m2m table for {field.name} ({m2m_table})")
                            try:
                                schema_editor.create_model(field.remote_field.through)
                                print(f"  -> Created m2m {m2m_table}")
                                existing_tables.append(m2m_table)
                            except Exception as e:
                                print(f"Error creating m2m: {e}")

if __name__ == '__main__':
    fix_schema()
