import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.academics.models import Subject, GlobalSubject, SyllabusMaster, SyllabusUnit, SyllabusChapter, SyllabusTopic

def migrate_subjects():
    print("🚀 Starting Data Migration for Subjects Library...")
    
    # 1. Migrate Subject Names to GlobalSubject
    all_subjects = Subject.objects.all()
    print(f"Found {all_subjects.count()} subject instances.")
    
    globals_count = 0
    links_count = 0
    
    for sub in all_subjects:
        # Get or create GlobalSubject by name
        # We assume subjects with the same name across classes should map to the same library item
        gsub, created = GlobalSubject.objects.get_or_create(
            name=sub.name,
            defaults={'description': sub.description or f"Default lib entry for {sub.name}"}
        )
        if created: globals_count += 1
        
        # Link the instance to the library item
        sub.global_subject = gsub
        sub.save()
        links_count += 1
        
    print(f"✅ Created {globals_count} GlobalSubject entries.")
    print(f"✅ Linked {links_count} Subject instances to Library.")

    # 2. Migrate Syllabus to SyllabusMaster
    # Each existing Syllabus (linked to a Subject) will become a Master Syllabus for that Class's Subject
    print("\n📦 Migrating Syllabus Units to Master Syllabus templates...")
    
    masters_count = 0
    units_migrated = 0
    
    # Get all subjects that have units
    subs_with_units = Subject.objects.filter(units__isnull=False).distinct()
    
    for sub in subs_with_units:
        if not sub.global_subject: continue
        
        # Create a Master Syllabus for this Subject instance (e.g. "Grade 10 Mathematics Syllabus")
        master_name = f"{sub.school_class.name if sub.school_class else 'Global'} {sub.name} Syllabus"
        master = SyllabusMaster.objects.create(
            name=master_name,
            global_subject=sub.global_subject,
            description=f"Initial migration from {sub.name}"
        )
        masters_count += 1
        
        # Move all units from Subject to Master
        units = SyllabusUnit.objects.filter(subject=sub)
        for unit in units:
            unit.master = master
            unit.save()
            units_migrated += 1
            
        # Link Subject instance to the new Master
        sub.syllabus_master = master
        sub.save()
        
    print(f"✅ Created {masters_count} SyllabusMaster blueprints.")
    print(f"✅ Repointed {units_migrated} SyllabusUnits.")
    
    print("\n🎉 Migration Complete!")

if __name__ == "__main__":
    migrate_subjects()
