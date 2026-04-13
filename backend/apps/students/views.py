from django.db.models import Count, Q
from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Class, Section, Student, StudentDocument
from .serializers import (
    ClassSerializer, SectionSerializer, StudentSerializer, 
    StudentRegistrationSerializer, StudentDocumentSerializer
)
from apps.permissions.mixins import RolePermissionMixin

# ─── ViewSets ─────────────────────────────────────────────────────────────────

class StudentViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    """
    Handles Student CRUD with RBAC and contextual RLS.
    - Admins / Superusers: see all students in their school.
    - Class Teachers: see all students in their assigned class's sections.
    - Subject Teachers: see students only in sections where they have allocations.
    """
    required_permission = 'students.view'
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'user__first_name', 'user__last_name',
        'admission_number', 'roll_number',
        'user__profile__father_name', 'user__profile__mother_name',
        'user__profile__parent_phone',
    ]
    
    
    def get_serializer_class(self):
        if self.action in ['create', 'partial_update', 'update']:
            return StudentRegistrationSerializer
        return StudentSerializer

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('paginate', '').lower() == 'false':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        user = self.request.user
        # Base queryset with necessary joins
        qs = Student.objects.select_related(
            "user", "user__profile", "section",
            "section__school_class", "academic_year"
        ).prefetch_related("documents").order_by("-admission_number")

        # ── Query param filters ──
        # Filter by school
        if not user.is_superuser and user.school:
            qs = qs.filter(user__school=user.school)

        # Query Parameters Filtering
        section_id = self.request.query_params.get("section")
        class_id = self.request.query_params.get("class")
        academic_year_ref = self.request.query_params.get("academic_year")
        is_active = self.request.query_params.get("is_active", "true")

        if section_id:
            qs = qs.filter(section_id=section_id)
        if class_id:
            qs = qs.filter(section__school_class_id=class_id)
        
        if academic_year_ref:
            if academic_year_ref.isdigit():
                qs = qs.filter(academic_year_id=academic_year_ref)
            else:
                qs = qs.filter(academic_year__name=academic_year_ref)
        
        if is_active.lower() == "true":
            qs = qs.filter(is_active=True)
        elif is_active.lower() == "false":
            qs = qs.filter(is_active=False)

        # ── Contextual Row-Level Security ──
        if user.is_superuser or (user.role and user.role.scope == 'school'):
            return qs

        # Build a union of accessible section IDs
        accessible = user.get_accessible_section_ids()
        if accessible:
            qs = qs.filter(section_id__in=accessible)
        else:
            qs = qs.none()

        # Apply Row Level Security (RLS) from Mixin if applicable
        # (Though super().get_queryset() would do this, we've already manually applied it here to be safe)
        if hasattr(user, 'assigned_class') and user.assigned_class and not user.is_superuser:
            qs = qs.filter(**user.get_class_filter())
            
        return qs

    def perform_create(self, serializer):
        """Restrict student creation to class-teacher sections or admin."""
        user = self.request.user
        section = serializer.validated_data.get('section')

        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            if section and not user.is_class_teacher_of(section):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    'You can only add students to your own class.'
                )
        serializer.save()

    def perform_update(self, serializer):
        """Restrict student updates to class-teacher sections or admin."""
        user = self.request.user
        student = self.get_object()
        section = student.section

        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            if section and not user.is_class_teacher_of(section):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    'You can only edit students in your own class.'
                )
        serializer.save()

    @action(detail=False, methods=['GET'])
    def leaderboard(self, request):
        """
        Returns top performing students across the school or filtered by class/section.
        """
        from django.db.models import Sum, Max, F, FloatField, ExpressionWrapper
        from apps.exams.models import ReportCard, Exam, ExamResult, ExamSchedule
        from apps.academics.models import Subject

        section_id = request.query_params.get("section")
        class_id = request.query_params.get("class")
        exam_id = request.query_params.get("exam")
        exam_type = request.query_params.get("exam_type")
        subject_id = request.query_params.get("subject_id")
        previous_exam_id = request.query_params.get("previous_exam")

        def build_class_section(student):
            if not student.section:
                return ""
            return f"{student.section.school_class.name} - {student.section.name}"

        # Subject-wise leaderboard (uses ExamResult aggregates)
        if subject_id:
            try:
                subject = Subject.objects.get(pk=subject_id)
            except Subject.DoesNotExist:
                return Response({"error": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

            exam_qs = Exam.objects.filter(is_published=True)
            if exam_id:
                exam_qs = exam_qs.filter(pk=exam_id)
            if exam_type:
                exam_qs = exam_qs.filter(exam_type=exam_type)
            if class_id:
                exam_qs = exam_qs.filter(school_class_id=class_id)
            elif section_id:
                exam_qs = exam_qs.filter(school_class_id=Section.objects.filter(pk=section_id).values_list("school_class_id", flat=True).first())

            exam = exam_qs.order_by("-start_date", "-id").first()
            if not exam:
                return Response([], status=status.HTTP_200_OK)

            schedules = ExamSchedule.objects.filter(exam_id=exam.id, subject_id=subject.id)
            res_qs = ExamResult.objects.select_related("student", "student__user", "student__section", "student__section__school_class").filter(exam_schedule__in=schedules)
            if section_id:
                res_qs = res_qs.filter(student__section_id=section_id)
            elif class_id:
                res_qs = res_qs.filter(student__section__school_class_id=class_id)

            agg = res_qs.values(
                "student_id",
                "student__user__first_name",
                "student__user__last_name",
                "student__roll_number",
                "student__section__school_class__name",
                "student__section__name",
            ).annotate(
                obtained=Sum("marks_obtained"),
                max_total=Sum("exam_schedule__max_marks"),
            )

            rows = []
            for row in agg:
                max_total = row["max_total"] or 0
                obtained = row["obtained"] or 0
                score = float(obtained) / float(max_total) * 100.0 if max_total else 0.0
                rows.append({
                    "student_id": row["student_id"],
                    "name": f"{row['student__user__first_name']} {row['student__user__last_name']}".strip(),
                    "roll": row["student__roll_number"],
                    "score": score,
                    "rank": None,
                    "class_section": f"{row['student__section__school_class__name']} - {row['student__section__name']}".strip(" -"),
                    "subject_name": subject.name,
                    "term_name": exam.exam_type,
                })
            rows.sort(key=lambda x: x["score"], reverse=True)
            rows = rows[:20]
            for i, r in enumerate(rows):
                r["rank"] = i + 1
            return Response(rows)

        # Overall leaderboard (uses published ReportCard)
        qs = ReportCard.objects.select_related(
            "student", "student__user", "student__section", "student__section__school_class", "exam"
        ).filter(is_published=True)

        if section_id:
            qs = qs.filter(student__section_id=section_id)
        elif class_id:
            qs = qs.filter(student__section__school_class_id=class_id)
        if exam_id:
            qs = qs.filter(exam_id=exam_id)
        if exam_type:
            qs = qs.filter(exam__exam_type=exam_type)

        qs = qs.order_by("-percentage")[:20]

        prev_map = {}
        if previous_exam_id:
            prev_qs = ReportCard.objects.filter(is_published=True, exam_id=previous_exam_id)
            if section_id:
                prev_qs = prev_qs.filter(student__section_id=section_id)
            elif class_id:
                prev_qs = prev_qs.filter(student__section__school_class_id=class_id)
            for rc in prev_qs:
                prev_map[rc.student_id] = float(rc.percentage) if rc.percentage else 0.0

        data = []
        for rc in qs:
            score = float(rc.percentage) if rc.percentage else 0.0
            prev = prev_map.get(rc.student_id)
            delta = (score - prev) if prev is not None else None
            data.append({
                "student_id": rc.student.id,
                "name": rc.student.user.get_full_name(),
                "roll": rc.student.roll_number,
                "score": score,
                "rank": rc.rank,
                "class_section": build_class_section(rc.student),
                "subject_name": None,
                "term_name": rc.exam.exam_type,
                "improvement_pct": delta,
            })
        return Response(data)

    @action(detail=False, methods=['GET'], url_path='admission/(?P<admission_number>[^/.]+)')
    def by_admission(self, request, admission_number=None):
        try:
            student = self.get_queryset().get(admission_number=admission_number)
            return Response(StudentSerializer(student).data)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)


class StudentDocumentViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    required_permission = 'students.view' # or 'students.edit'
    serializer_class = StudentDocumentSerializer

    def get_queryset(self):
        return StudentDocument.objects.filter(student_id=self.kwargs['student_pk'])

    def perform_create(self, serializer):
        serializer.save(student_id=self.kwargs['student_pk'])


# ─── Function Based Views (Refactored/Legacy) ─────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def class_list_view(request):
    try:
        if request.method == "GET":
            school_id = request.query_params.get("school")
            qs = Class.objects.all()
            if school_id:
                qs = qs.filter(school_id=school_id)
            elif not request.user.is_superuser and request.user.school:
                qs = qs.filter(school=request.user.school)
            return Response(ClassSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ClassSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Fallback for superusers/admins not explicitly linked to a school
        school = request.user.school
        if not school and request.user.is_superuser:
            from apps.accounts.models import School
            school = School.objects.first()
            if school:
                # Optional: auto-link the user for future requests
                request.user.school = school
                request.user.save(update_fields=['school'])

        if not school:
            return Response({"error": "Your account is not linked to a school."}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer.save(school=school)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def class_detail_view(request, pk):
    try:
        try:
            school_class = Class.objects.get(pk=pk)
        except Class.DoesNotExist:
            return Response({"error": "Class not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(ClassSerializer(school_class).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = ClassSerializer(school_class, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        school_class.delete()
        return Response({"message": "Class deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def section_list_view(request):
    try:
        if request.method == "GET":
            class_id = request.query_params.get("class")
            qs = Section.objects.select_related("school_class", "class_teacher").annotate(
                student_count=Count('students')
            ).all()
            
            # Filter by school if possible
            if not request.user.is_superuser and request.user.school:
                qs = qs.filter(school_class__school=request.user.school)
                
            if class_id:
                qs = qs.filter(school_class_id=class_id)
            return Response(SectionSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = SectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def section_detail_view(request, pk):
    try:
        try:
            section = Section.objects.select_related("school_class", "class_teacher").annotate(
                student_count=Count('students')
            ).get(pk=pk)
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(SectionSerializer(section).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = SectionSerializer(section, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        section.delete()
        return Response({"message": "Section deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
