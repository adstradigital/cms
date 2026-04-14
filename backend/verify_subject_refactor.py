import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.academics.models import GlobalSubject, Subject, SubjectBundle, SyllabusMaster, SubjectAllocation
from apps.students.models import Class, Section
from apps.accounts.models import School, AcademicYear
from apps.academics.bundling_service import BundlingService

def test_subject_system():
    print("🧪 Testing Advanced Subject System...")
    
    school = School.objects.first()
    ay = AcademicYear.objects.filter(school=school, is_active=True).first()
    
    # 1. Create a Global Subject if it doesn't exist
    gs_cs, _ = GlobalSubject.objects.get_or_create(name="Advanced AI", category="Tech")
    
    # 2. Create a Syllabus Master for it
    master, _ = SyllabusMaster.objects.get_or_create(
        name="AI Master Cursor", 
        global_subject=gs_cs,
        defaults={'description': 'Root curriculum for AI'}
    )
    
    # 3. Create a Bundle
    bundle, _ = SubjectBundle.objects.get_or_create(name="Tech Savvy Bundle", school=school)
    bundle.subjects.add(gs_cs)
    
    # 4. Create a New Class for testing
    test_class, _ = Class.objects.get_or_create(school=school, name="Test Innovation Lab")
    
    # 5. Apply Bundle via Service
    print(f"Applying bundle '{bundle.name}' to '{test_class.name}'...")
    created, errors = BundlingService.apply_bundle_to_class(test_class, bundle, ay)
    
    if errors:
        print(f"❌ Errors: {errors}")
    else:
        print(f"✅ Created {len(created)} subjects.")
        for s in created:
            print(f"   - {s.name} (Global ID: {s.global_subject_id}, Syllabus ID: {s.syllabus_master_id})")
            assert s.global_subject == gs_cs
            assert s.syllabus_master == master

    print("\n🎉 Test Successful!")

if __name__ == "__main__":
    test_subject_system()
