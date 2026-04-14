import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.students.models import Section
from apps.accounts.models import User
from apps.academics.models import SubjectAllocation

def run_repair():
    sections_missing = Section.objects.filter(class_teacher__isnull=True)
    if not sections_missing.exists():
        print("Success: All sections already have Class Teachers.")
        return

    print(f"Found {sections_missing.count()} sections missing Class Teachers.")
    
    # 1. Identify "Free" Teachers (not class teachers elsewhere)
    assigned_teacher_ids = Section.objects.filter(class_teacher__isnull=False).values_list('class_teacher_id', flat=True)
    free_teachers = User.objects.filter(
        staff_profile__is_teaching_staff=True,
        is_active=True
    ).exclude(id__in=assigned_teacher_ids)
    
    print(f"Number of Available (Unassigned) Teachers: {free_teachers.count()}")
    for ft in free_teachers[:10]:
        print(f" - Available: {ft.get_full_name()} (ID: {ft.id})")

    # 2. Logic: Who should manage Section 1 & 2?
    # Let's see who teaches most subjects in those sections.
    for section in sections_missing:
        allocations = SubjectAllocation.objects.filter(section=section)
        # Count occurrences of teachers in these allocations
        teacher_votes = {}
        for alloc in allocations:
            for t in alloc.teachers.all():
                if t.id not in assigned_teacher_ids:
                    teacher_votes[t.id] = teacher_votes.get(t.id, 0) + 1
        
        if teacher_votes:
            # Pick the most active available teacher for this section
            best_id = max(teacher_votes, key=teacher_votes.get)
            best_teacher = User.objects.get(id=best_id)
            print(f"\nRecommendation for {section.school_class.name} {section.name}:")
            print(f" -> Assign {best_teacher.get_full_name()} (ID: {best_id})")
            print(f"    Reason: They teach {teacher_votes[best_id]} subjects in this section.")
            
            # AUTO REPAIR
            section.class_teacher = best_teacher
            section.save()
            print(f" Successfully repaired Section {section.id} ({section.name}) -> Assigned {best_teacher.get_full_name()}!")
        else:
            print(f"\nNo obvious candidate for {section.school_class.name} {section.name}. Manual assignment required.")

if __name__ == "__main__":
    run_repair()
