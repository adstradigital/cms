from rest_framework import status, viewsets
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
    Handles Student CRUD with RBAC and RLS.
    """
    required_permission = 'students.view'
    serializer_class = StudentSerializer
    
    def get_queryset(self):
        # Base queryset with necessary joins
        qs = Student.objects.select_related(
            "user", "user__profile", "section",
            "section__school_class", "academic_year"
        ).prefetch_related("documents").all()
        
        # Apply RLS via Mixin (scopes to teacher's class if applicable)
        qs = super().get_queryset() 
        # Wait, super().get_queryset() will return the plain queryset from the model if not overridden.
        # I should make sure super().get_queryset() uses the base queryset.
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'partial_update', 'update']:
            return StudentRegistrationSerializer
        return StudentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Student.objects.select_related(
            "user", "user__profile", "section",
            "section__school_class", "academic_year"
        ).prefetch_related("documents")

        # Porting filters from function views
        section_id = self.request.query_params.get("section")
        class_id = self.request.query_params.get("class")
        academic_year_id = self.request.query_params.get("academic_year")
        is_active = self.request.query_params.get("is_active", "true")

        if section_id:
            qs = qs.filter(section_id=section_id)
        if class_id:
            qs = qs.filter(section__school_class_id=class_id)
        if academic_year_id:
            qs = qs.filter(academic_year_id=academic_year_id)
        if is_active.lower() == "true":
            qs = qs.filter(is_active=True)

        # Apply Row Level Security (RLS) from Mixin
        if user.assigned_class and not user.is_superuser:
            qs = qs.filter(**user.get_class_filter())
            
        return qs

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
            return Response(ClassSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = ClassSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
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
            qs = Section.objects.select_related("school_class", "class_teacher").all()
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
            section = Section.objects.select_related("school_class", "class_teacher").get(pk=pk)
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
