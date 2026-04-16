from .models import GlobalSubject, Subject, SubjectBundle, SyllabusMaster, SyllabusUnit

class BundlingService:
    @staticmethod
    def apply_bundle_to_class(school_class, bundle, academic_year):
        """
        Applies all subjects in a bundle to a specific class.
        If a subject already exists in the class, it skips it.
        """
        created_subjects = []
        errors = []
        
        for g_subject in bundle.subjects.all():
            # Generate a unique code for this instance
            code = f"{g_subject.name[:3].upper()}{school_class.id}{g_subject.id}"
            
            # Check if this subject already exists for this class
            if Subject.objects.filter(school_class=school_class, global_subject=g_subject).exists():
                continue
                
            try:
                # Find the default syllabus master for this global subject
                # (Picking the newest active one as default)
                master = SyllabusMaster.objects.filter(
                    global_subject=g_subject, 
                    is_active=True
                ).order_by("-created_at").first()
                
                # Create the subject instance
                sub = Subject.objects.create(
                    school=school_class.school,
                    school_class=school_class,
                    global_subject=g_subject,
                    syllabus_master=master,
                    name=g_subject.name,
                    code=code,
                    weekly_periods=5, # Default
                )
                created_subjects.append(sub)
            except Exception as e:
                errors.append(f"Error creating {g_subject.name}: {str(e)}")
                
        return created_subjects, errors
