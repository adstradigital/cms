import os
import django

# Setup Django environment
import sys
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.academics.models import Subject, SyllabusUnit, SubjectAllocation, Period, Homework, Assignment, Material, CourseSession
from apps.attendance.models import Attendance
from apps.exams.models import ExamSchedule, QuestionBank, QuestionPaper

def cleanup():
    print("Starting subject cleanup...")
    # Group by class and name
    groups = {}
    for s in Subject.objects.all():
        # Use lowercase and stripped name for matching
        key = (s.school_class_id, s.name.strip().lower())
        if key not in groups:
            groups[key] = []
        groups[key].append(s)
    
    total_deleted = 0
    for key, subjects in groups.items():
        if len(subjects) <= 1:
            continue
        
        # Sort by ID to keep the first one as master
        subjects.sort(key=lambda x: x.id)
        master = subjects[0]
        duplicates = subjects[1:]
        
        class_name = master.school_class.name if master.school_class else "Global"
        print(f"\nProcessing '{master.name}' in {class_name}:")
        
        for dup in duplicates:
            try:
                # Re-link relations to the master subject
                SyllabusUnit.objects.filter(subject=dup).update(subject=master)
                SubjectAllocation.objects.filter(subject=dup).update(subject=master)
                Period.objects.filter(subject=dup).update(subject=master)
                Homework.objects.filter(subject=dup).update(subject=master)
                Assignment.objects.filter(subject=dup).update(subject=master)
                Material.objects.filter(subject=dup).update(subject=master)
                CourseSession.objects.filter(subject=dup).update(subject=master)
                Attendance.objects.filter(subject=dup).update(subject=master)
                
                # Special handling for ExamSchedule to avoid IntegrityError if master already has that exam
                for es in ExamSchedule.objects.filter(subject=dup):
                    if not ExamSchedule.objects.filter(exam=es.exam, subject=master).exists():
                        es.subject = master
                        es.save()
                    else:
                        print(f"  Warning: Schedule for {es.exam} already exists for master. Deleting duplicate schedule.")
                        es.delete()

                QuestionBank.objects.filter(subject=dup).update(subject=master)
                QuestionPaper.objects.filter(subject=dup).update(subject=master)
                
                # Delete the duplicate subject instance
                code = dup.code
                dup_id = dup.id
                dup.delete()
                print(f"  - Deleted duplicate ID {dup_id} (Code: {code})")
                total_deleted += 1
            except Exception as e:
                print(f"  - Error processing duplicate {dup.id}: {str(e)}")

    print(f"\nCleanup complete. Total duplicate subjects removed: {total_deleted}")

if __name__ == "__main__":
    cleanup()
