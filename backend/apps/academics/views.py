from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from .models import (
    Subject, SyllabusUnit, SyllabusChapter, SyllabusTopic, SubjectAllocation, LessonPlan,
    Timetable, Period, Homework, HomeworkSubmission, SubstituteLog, Assignment, Material,
    CourseSession,
)
from .serializers import (
    SubjectSerializer, SyllabusUnitSerializer, SyllabusChapterSerializer, SyllabusTopicSerializer,
    SubjectAllocationSerializer, LessonPlanSerializer,
    TimetableSerializer, PeriodSerializer,
    HomeworkSerializer, HomeworkSubmissionSerializer, SubstituteLogSerializer,
    AssignmentSerializer, MaterialSerializer,
    CourseSessionSerializer,
)
from .generator_service import TimetableGenerator
from apps.accounts.models import AcademicYear

from apps.staff.models import StaffAttendance, Staff
from apps.students.models import Section


# ─── Subject ──────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def subject_list_view(request):
    try:
        if request.method == "GET":
            school_class_id = request.query_params.get("school_class")
            qs = Subject.objects.prefetch_related("units__chapters").all()
            # Scope subjects by school for non-superusers
            user = request.user
            if not user.is_superuser and user.school:
                qs = qs.filter(school=user.school)
            if school_class_id:
                qs = qs.filter(school_class_id=school_class_id)
            return Response(SubjectSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        data = request.data.copy()
        user = request.user
        if not data.get("school_class"):
            return Response({"error": "school_class is required for subject configuration."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_superuser and user.school and not data.get("school"):
            data["school"] = user.school_id

        serializer = SubjectSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def subject_detail_view(request, pk):
    try:
        try:
            subject = Subject.objects.prefetch_related("units__chapters").get(pk=pk)
        except Subject.DoesNotExist:
            return Response({"error": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(SubjectSerializer(subject).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = SubjectSerializer(subject, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        subject.delete()
        return Response({"message": "Subject deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Timetable ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def timetable_list_view(request):
    try:
        if request.method == "GET":
            class_name_input = request.query_params.get("class_name")
            section_id = request.query_params.get("section")
            academic_year_id = request.query_params.get("academic_year")
            day = request.query_params.get("day")

            qs = Timetable.objects.select_related(
                "section", "section__school_class", "academic_year"
            ).prefetch_related("periods__subject", "periods__teacher").all()

            if class_name_input:
                try:
                    parts = class_name_input.split(" - ")
                    if len(parts) == 2:
                        c_name, s_name = parts
                        qs = qs.filter(section__school_class__name=c_name, section__name=s_name)
                    else:
                        qs = qs.filter(section__name=class_name_input)
                except Exception:
                    pass

            if section_id:
                qs = qs.filter(section_id=section_id)
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            if day:
                # Handle both code (1-6) and name
                day_map = {name: code for code, name in Timetable.DAY_CHOICES}
                if day in day_map:
                    day = day_map[day]
                qs = qs.filter(day_of_week=day)

            return Response(TimetableSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = TimetableSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def timetable_detail_view(request, pk):
    try:
        try:
            timetable = Timetable.objects.select_related(
                "section", "section__school_class", "academic_year"
            ).prefetch_related("periods__subject", "periods__teacher").get(pk=pk)
        except Timetable.DoesNotExist:
            return Response({"error": "Timetable not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(TimetableSerializer(timetable).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = TimetableSerializer(timetable, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        timetable.delete()
        return Response({"message": "Timetable deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def timetable_publish_view(request, pk=None):
    """
    Publishes a single day or a bulk set of timetables.
    """
    try:
        if pk:
            Timetable.objects.filter(pk=pk).update(is_published=True)
            return Response({"message": "Timetable published."}, status=status.HTTP_200_OK)
        
        # Bulk Publish
        section_id = request.data.get("section")
        class_id = request.data.get("class")
        
        qs = Timetable.objects.all()
        if section_id:
            qs = qs.filter(section_id=section_id)
        if class_id:
            qs = qs.filter(section__school_class_id=class_id)
            
        count = qs.update(is_published=True)
        return Response({"message": f"Published {count} timetable records."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def auto_allocate_subjects(section, academic_year):
    """
    Helper to create default subject allocations if missing.
    Assigns available teaching staff to subjects tied to the class.
    """
    from apps.staff.models import Staff
    from django.db import transaction

    # Get subjects for this class
    subjects = Subject.objects.filter(school_class=section.school_class)
    if not subjects.exists():
        return False, "No subjects found for this class. Please define subjects first."

    # Get all teaching staff users
    teachers = User.objects.filter(staff_profile__is_teaching_staff=True, is_active=True)
    if not teachers.exists():
        return False, "No teaching staff found in the system."

    allocations_created = []
    with transaction.atomic():
        for i, subject in enumerate(subjects):
            # Simple round-robin assignment for fallback
            teacher = teachers[i % teachers.count()]
            allocation, created = SubjectAllocation.objects.get_or_create(
                subject=subject,
                section=section,
                academic_year=academic_year
            )
            if created:
                allocation.teacher = teacher
                allocation.save()
                allocations_created.append(f"{subject.name} -> {teacher.get_full_name()}")
    
    return True, f"Auto-allocated {len(allocations_created)} subjects."


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def timetable_generate_view(request):
    """
    AI-Assisted generator trigger.
    """
    try:
        section_id = request.data.get("section_id")
        # Find numeric section if class_name was sent (compatibility)
        class_name = request.data.get("class_name")
        
        section = None
        if section_id:
            section = Section.objects.get(pk=section_id)
        elif class_name:
            parts = class_name.split(" - ")
            if len(parts) == 2:
                c_name, s_name = parts
                section = Section.objects.get(school_class__name=c_name, name=s_name)
            else:
                section = Section.objects.get(name=class_name)

        if not section:
            return Response({"error": "Section not found."}, status=404)

        # Get current active academic year or from request
        ay_id = request.data.get("academic_year")
        if ay_id:
            academic_year = AcademicYear.objects.get(pk=ay_id)
        else:
            academic_year = AcademicYear.objects.filter(is_active=True).first()

        if not academic_year:
            return Response({"error": "Active academic year not found."}, status=400)

        # CHECK FOR ALLOCATIONS: Trigger auto-allocation fallback if missing
        allocations = SubjectAllocation.objects.filter(section=section, academic_year=academic_year)
        auto_note = None
        if not allocations.exists():
            success, message = auto_allocate_subjects(section, academic_year)
            if not success:
                return Response({"error": message}, status=400)
            auto_note = message

        generator = TimetableGenerator(section, academic_year)
        result = generator.generate()

        if "error" in result:
            return Response(result, status=400)
        
        if auto_note:
            result["note"] = f"{result.get('note', '')} ({auto_note})".strip()
        
        return Response(result, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def timetable_draft_view(request):
    """
    Saves a full timetable grid from the frontend (Used for manual edits / drafts).
    """
    try:
        data = request.data
        class_name = data.get("class_name")
        schedule = data.get("schedule") # Map of { Day: [ Slots ] }
        
        parts = class_name.split(" - ")
        if len(parts) == 2:
            c_name, s_name = parts
            section = Section.objects.get(school_class__name=c_name, name=s_name)
        else:
            section = Section.objects.get(name=class_name)

        ay = AcademicYear.objects.filter(is_active=True).first()
        
        day_name_to_id = {name: code for code, name in Timetable.DAY_CHOICES}

        with transaction.atomic():
            for day_name, p_list in schedule.items():
                day_id = day_name_to_id.get(day_name)
                if not day_id: continue
                
                tt, _ = Timetable.objects.get_or_create(
                    section=section,
                    academic_year=ay,
                    day_of_week=day_id
                )
                
                # If not published, we clear and rebuild
                if not tt.is_published:
                    tt.periods.all().delete()
                    for idx, p_data in enumerate(p_list):
                        if not p_data: continue
                        
                        period_type = 'class'
                        if p_data.get('isBreak'): period_type = 'break'
                        if p_data.get('isEvent'): period_type = 'class' # or special
                        
                        # Find subject and teacher if provided
                        subject = None
                        if p_data.get('subject'):
                            subject = Subject.objects.filter(name=p_data['subject']).first()
                        
                        teacher = None
                        if p_data.get('teacher'):
                            teacher = User.objects.filter(first_name=p_data['teacher'].split(' ')[0]).first()

                        Period.objects.create(
                            timetable=tt,
                            period_number=idx + 1,
                            period_type=period_type,
                            subject=subject,
                            teacher=teacher,
                            start_time=data.get('periods')[idx]['time'].split(' - ')[0],
                            end_time=data.get('periods')[idx]['time'].split(' - ')[1]
                        )
        
        return Response({"status": "success"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Period ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def period_create_view(request, timetable_pk):
    try:
        data = {**request.data, "timetable": timetable_pk}
        serializer = PeriodSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        teacher_id = request.data.get("teacher")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")

        if teacher_id and start_time and end_time:
            conflict = Period.objects.filter(
                timetable__day_of_week=Timetable.objects.get(pk=timetable_pk).day_of_week,
                teacher_id=teacher_id,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).exclude(timetable_id=timetable_pk)

            if conflict.exists():
                return Response(
                    {"error": "Teacher already has a period at this time on this day."},
                    status=status.HTTP_409_CONFLICT,
                )

        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def period_detail_view(request, pk):
    try:
        try:
            period = Period.objects.select_related("subject", "teacher", "timetable").get(pk=pk)
        except Period.DoesNotExist:
            return Response({"error": "Period not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            serializer = PeriodSerializer(period, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        period.delete()
        return Response({"message": "Period deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Homework ─────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def homework_list_view(request):
    try:
        user = request.user
        if request.method == "GET":
            section_id = request.query_params.get("section")
            subject_id = request.query_params.get("subject")
            due_date = request.query_params.get("due_date")

            qs = Homework.objects.select_related(
                "subject", "section", "section__school_class", "assigned_by"
            ).all()

            # Contextual scoping: non-admin teachers only see their accessible sections
            if not user.is_superuser and not (user.role and user.role.scope == 'school'):
                accessible = user.get_accessible_section_ids()
                if accessible:
                    qs = qs.filter(section_id__in=accessible)
                else:
                    qs = qs.none()

            if section_id:
                qs = qs.filter(section_id=section_id)
            if subject_id:
                qs = qs.filter(subject_id=subject_id)
            if due_date:
                qs = qs.filter(due_date=due_date)

            return Response(HomeworkSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        # Write Guard: Ensure user has access to the section
        section_id = request.data.get('section')
        if not user.is_superuser and not (user.role and user.role.scope == 'school'):
            accessible = user.get_accessible_section_ids()
            if not section_id or int(section_id) not in accessible:
                return Response({"error": "You do not have permission to create homework for this section."}, status=status.HTTP_403_FORBIDDEN)

        serializer = HomeworkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        homework = serializer.save(assigned_by=request.user)
        return Response(HomeworkSerializer(homework).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def homework_detail_view(request, pk):
    try:
        try:
            homework = Homework.objects.select_related(
                "subject", "section", "section__school_class", "assigned_by"
            ).get(pk=pk)
        except Homework.DoesNotExist:
            return Response({"error": "Homework not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(HomeworkSerializer(homework).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = HomeworkSerializer(homework, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        homework.delete()
        return Response({"message": "Homework deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Homework Submission ──────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def homework_submission_list_view(request, homework_pk):
    try:
        if request.method == "GET":
            qs = HomeworkSubmission.objects.select_related(
                "student", "student__user", "homework"
            ).filter(homework_id=homework_pk)
            return Response(HomeworkSubmissionSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        try:
            homework = Homework.objects.get(pk=homework_pk)
        except Homework.DoesNotExist:
            return Response({"error": "Homework not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {**request.data, "homework": homework_pk}
        serializer = HomeworkSubmissionSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        is_late = timezone.now().date() > homework.due_date
        submission = serializer.save(is_late=is_late)
        return Response(HomeworkSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def homework_submission_grade_view(request, pk):
    """Teacher grades a submission."""
    try:
        try:
            submission = HomeworkSubmission.objects.get(pk=pk)
        except HomeworkSubmission.DoesNotExist:
            return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)

        grade = request.data.get("grade")
        remarks = request.data.get("remarks", "")

        if not grade:
            return Response({"error": "Grade is required."}, status=status.HTTP_400_BAD_REQUEST)

        submission.grade = grade
        submission.remarks = remarks
        submission.save()
        return Response(HomeworkSubmissionSerializer(submission).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Substitute ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def substitute_log_list_view(request):
    try:
        if request.method == "GET":
            date = request.query_params.get("date", timezone.now().date())
            teacher_id = request.query_params.get("teacher")
            qs = SubstituteLog.objects.select_related(
                "period", "period__timetable__section",
                "original_teacher", "substitute_teacher"
            ).filter(date=date)
            if teacher_id:
                qs = qs.filter(original_teacher_id=teacher_id)
            return Response(SubstituteLogSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = SubstituteLogSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        log = serializer.save()
        return Response(SubstituteLogSerializer(log).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_substitutes_view(request):
    """
    Returns teachers who are free at a given day + time slot.
    Query params: day (1-6), start_time (HH:MM), end_time (HH:MM)
    """
    try:
        day = request.query_params.get("day")
        start_time = request.query_params.get("start_time")
        end_time = request.query_params.get("end_time")

        if not all([day, start_time, end_time]):
            return Response(
                {"error": "day, start_time and end_time are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        busy_teacher_ids = Period.objects.filter(
            timetable__day_of_week=day,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).values_list("teacher_id", flat=True)

        available = User.objects.filter(
            role__name="teacher"
        ).exclude(id__in=busy_teacher_ids)

        from apps.accounts.serializers import UserSerializer
        return Response(UserSerializer(available, many=True).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Assignment ───────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def assignment_list_view(request):
    try:
        user = request.user
        if request.method == "GET":
            subject_id = request.query_params.get("subject")
            section_id = request.query_params.get("section")
            is_project = request.query_params.get("is_project")

            qs = Assignment.objects.select_related("subject", "section", "teacher").all()

            # Contextual scoping
            if not user.is_superuser and not (user.role and user.role.scope == 'school'):
                accessible = user.get_accessible_section_ids()
                if accessible:
                    qs = qs.filter(section_id__in=accessible)
                else:
                    qs = qs.none()

            if subject_id: qs = qs.filter(subject_id=subject_id)
            if section_id: qs = qs.filter(section_id=section_id)
            if is_project is not None: qs = qs.filter(is_project=is_project.lower() == "true")

            return Response(AssignmentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        # Write Guard
        section_id = request.data.get('section')
        if not user.is_superuser and not (user.role and user.role.scope == 'school'):
            accessible = user.get_accessible_section_ids()
            if not section_id or int(section_id) not in accessible:
                return Response({"error": "You do not have permission to create assignments for this section."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AssignmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        assignment = serializer.save(teacher=request.user)
        return Response(AssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def assignment_detail_view(request, pk):
    try:
        try:
            assignment = Assignment.objects.get(pk=pk)
        except Assignment.DoesNotExist:
            return Response({"error": "Assignment not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(AssignmentSerializer(assignment).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = AssignmentSerializer(assignment, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        assignment.delete()
        return Response({"message": "Assignment deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Material ─────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def material_list_view(request):
    try:
        user = request.user
        if request.method == "GET":
            subject_id = request.query_params.get("subject")
            section_id = request.query_params.get("section")
            type = request.query_params.get("type")

            qs = Material.objects.select_related("subject", "section", "teacher").all()

            # Contextual scoping
            if not user.is_superuser and not (user.role and user.role.scope == 'school'):
                accessible = user.get_accessible_section_ids()
                if accessible:
                    qs = qs.filter(section_id__in=accessible)
                else:
                    qs = qs.none()

            if subject_id: qs = qs.filter(subject_id=subject_id)
            if section_id: qs = qs.filter(section_id=section_id)
            if type: qs = qs.filter(material_type=type)

            return Response(MaterialSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        # Write Guard
        section_id = request.data.get('section')
        if not user.is_superuser and not (user.role and user.role.scope == 'school'):
            accessible = user.get_accessible_section_ids()
            if not section_id or int(section_id) not in accessible:
                return Response({"error": "You do not have permission to create materials for this section."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MaterialSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        material = serializer.save(teacher=request.user)
        return Response(MaterialSerializer(material).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def material_detail_view(request, pk):
    try:
        try:
            material = Material.objects.get(pk=pk)
        except Material.DoesNotExist:
            return Response({"error": "Material not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(MaterialSerializer(material).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = MaterialSerializer(material, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        material.delete()
        return Response({"message": "Material deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ─── Syllabus & Lesson Planning ───────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def syllabus_unit_list_view(request):
    if request.method == "GET":
        subject_id = request.query_params.get("subject")
        qs = SyllabusUnit.objects.all()
        if subject_id: qs = qs.filter(subject_id=subject_id)
        return Response(SyllabusUnitSerializer(qs, many=True).data)
    
    serializer = SyllabusUnitSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def syllabus_unit_detail_view(request, pk):
    try:
        unit = SyllabusUnit.objects.get(pk=pk)
    except SyllabusUnit.DoesNotExist:
        return Response({"error": "Unit not found."}, status=404)
    if request.method == "GET":
        return Response(SyllabusUnitSerializer(unit).data)
    if request.method == "DELETE":
        unit.delete()
        return Response(status=204)
    serializer = SyllabusUnitSerializer(unit, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def syllabus_chapter_list_view(request):
    if request.method == "GET":
        unit_id = request.query_params.get("unit")
        qs = SyllabusChapter.objects.all()
        if unit_id: qs = qs.filter(unit_id=unit_id)
        return Response(SyllabusChapterSerializer(qs, many=True).data)
    
    serializer = SyllabusChapterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def syllabus_chapter_detail_view(request, pk):
    try:
        chapter = SyllabusChapter.objects.get(pk=pk)
    except SyllabusChapter.DoesNotExist:
        return Response({"error": "Chapter not found."}, status=404)
    if request.method == "GET":
        return Response(SyllabusChapterSerializer(chapter).data)
    if request.method == "DELETE":
        chapter.delete()
        return Response(status=204)
    serializer = SyllabusChapterSerializer(chapter, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def syllabus_topic_list_view(request):
    if request.method == "GET":
        chapter_id = request.query_params.get("chapter")
        qs = SyllabusTopic.objects.all()
        if chapter_id: qs = qs.filter(chapter_id=chapter_id)
        return Response(SyllabusTopicSerializer(qs, many=True).data)
    
    serializer = SyllabusTopicSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def syllabus_topic_detail_view(request, pk):
    try:
        topic = SyllabusTopic.objects.get(pk=pk)
    except SyllabusTopic.DoesNotExist:
        return Response({"error": "Topic not found."}, status=404)
    if request.method == "GET":
        return Response(SyllabusTopicSerializer(topic).data)
    if request.method == "DELETE":
        topic.delete()
        return Response(status=204)
    serializer = SyllabusTopicSerializer(topic, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def subject_allocation_list_view(request):
    if request.method == "GET":
        section_id = request.query_params.get("section")
        teacher_id = request.query_params.get("teacher")
        subject_id = request.query_params.get("subject")
        qs = SubjectAllocation.objects.select_related("subject", "section", "teacher", "substitute_teacher").all()
        
        user = request.user
        # Strict filtering: if not a school admin, only show allocations where this user is primary or substitute
        if not user.is_superuser and not (user.role and user.role.scope == 'school'):
            qs = qs.filter(Q(teacher=user) | Q(substitute_teacher=user))

        if section_id: qs = qs.filter(section_id=section_id)
        if teacher_id: qs = qs.filter(Q(teacher_id=teacher_id) | Q(substitute_teacher_id=teacher_id))
        if subject_id: qs = qs.filter(subject_id=subject_id)
        
        # Add distinct() because filtering by OR can cause duplicates
        qs = qs.distinct()
        
        return Response(SubjectAllocationSerializer(qs, many=True).data)
    
    serializer = SubjectAllocationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def subject_allocation_detail_view(request, pk):
    try:
        allocation = SubjectAllocation.objects.get(pk=pk)
    except SubjectAllocation.DoesNotExist:
        return Response({"error": "NotFound"}, status=404)
    if request.method == "DELETE":
        allocation.delete()
        return Response(status=204)
    serializer = SubjectAllocationSerializer(allocation, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def lesson_plan_list_view(request):
    if request.method == "GET":
        allocation_id = request.query_params.get("allocation")
        topic_id = request.query_params.get("topic")
        master = request.query_params.get("master")
        
        qs = LessonPlan.objects.all()
        if allocation_id: 
            qs = qs.filter(allocation_id=allocation_id)
        elif master == "true":
            qs = qs.filter(allocation__isnull=True)
            
        if topic_id: qs = qs.filter(topic_id=topic_id)
        return Response(LessonPlanSerializer(qs, many=True).data)
    
    data = request.data
    try:
        plan, created = LessonPlan.objects.update_or_create(
            allocation_id=data.get("allocation"),
            topic_id=data.get("topic"),
            defaults={
                "title": data.get("title", "Plan"),
                "status": data.get("status", "pending"),
                "description": data.get("description", ""),
                "planned_date": data.get("planned_date") if data.get("planned_date") else None,
                "actual_date": timezone.now().date() if data.get("status") == "completed" else None
            }
        )
        return Response(LessonPlanSerializer(plan).data, status=200 if not created else 201)
    except Exception as e:
        print("PLAN SAVE ERROR:", str(e), "DATA:", data)
        return Response({"error": str(e)}, status=400)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def timetable_settings_view(request):
    """
    Returns/Updates general timetable configuration.
    """
    ay = AcademicYear.objects.filter(is_active=True).first()
    
    if request.method == "POST":
        if not ay:
            return Response({"error": "No active academic year found."}, status=400)
            
        working_day_names = request.data.get("working_days", [])
        day_map = {name: code for code, name in Timetable.DAY_CHOICES}
        working_codes = [day_map[name] for name in working_day_names if name in day_map]
        
        ay.working_days = working_codes
        
        # Save full config
        ay.timetable_config = {
            "periods": request.data.get("periods", []),
            "time_format": request.data.get("time_format", "24h"),
            "time_zone": request.data.get("time_zone", "UTC"),
            "locale": request.data.get("locale", "en-US"),
        }
        ay.save()
        return Response({"message": "Settings updated."}, status=200)

    # GET
    working_codes = ay.working_days if ay else [1, 2, 3, 4, 5]
    day_name_map = {code: name for code, name in Timetable.DAY_CHOICES}
    working_day_names = [day_name_map[code] for code in working_codes if code in day_name_map]

    config = ay.timetable_config if ay and ay.timetable_config else {}
    
    return Response({
        "standard_periods": config.get("standard_periods", 10),
        "periods": config.get("periods", []),
        "time_format": config.get("time_format", "24h"),
        "time_zone": config.get("time_zone", "UTC"),
        "locale": config.get("locale", "en-US"),
        "working_days": working_day_names
    }, status=status.HTTP_200_OK)

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def lesson_plan_detail_view(request, pk):
    try:
        plan = LessonPlan.objects.get(pk=pk)
    except LessonPlan.DoesNotExist:
        return Response({"error": "Plan not found."}, status=404)
    if request.method == "GET":
        return Response(LessonPlanSerializer(plan).data)
    if request.method == "DELETE":
        plan.delete()
        return Response(status=204)
    serializer = LessonPlanSerializer(plan, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)




@api_view(["GET"])
@permission_classes([IsAuthenticated])
def absence_status_view(request):
    """
    Checks teacher attendance and maps it to timetable periods for a class/day.
    """
    class_name_input = request.query_params.get("class_name")
    day_name = request.query_params.get("day")
    
    if not class_name_input or not day_name:
        return Response({"error": "class_name and day are required."}, status=400)
    
    def clean_name(n):
        return n.replace("Class", "").replace("Section", "").replace("Grade", "").replace("Level", "").replace("-", " ").strip()

    try:
        # 1. Try exact match on section name (e.g. "A" or "10A")
        section = Section.objects.filter(name__iexact=class_name_input.strip()).first()
        
        # 2. Try cleaning and searching
        if not section:
            clean_input = clean_name(class_name_input)
            parts = clean_input.split() # Splits on spaces
            
            if len(parts) >= 2:
                # Most common: Class=parts[0], Section=parts[-1]
                c_part, s_part = parts[0], parts[-1]
                section = Section.objects.filter(
                    models.Q(school_class__name__icontains=c_part) & 
                    models.Q(name__iexact=s_part)
                ).first()
            
            # 3. Final fallback: Contains search on full string
            if not section:
                section = Section.objects.filter(
                    models.Q(school_class__name__icontains=clean_input) |
                    models.Q(name__icontains=clean_input)
                ).first()
        
        if not section:
            return Response({"error": f"Section '{class_name_input}' not found."}, status=404)
            
    except Exception as e:
        return Response({"error": f"Search failed: {str(e)}"}, status=500)

    day_map = {name: code for code, name in Timetable.DAY_CHOICES}
    day_code = day_map.get(day_name)
    if not day_code:
        return Response({"error": f"Invalid day '{day_name}'."}, status=400)

    timetable = Timetable.objects.filter(section=section, day_of_week=day_code).first()
    if not timetable:
        return Response({"error": "No timetable found for this section/day."}, status=404)

    today = timezone.now().date()
    absent_staff_ids = StaffAttendance.objects.filter(
        date=today,
        status__in=['absent', 'on_leave']
    ).values_list('staff__user_id', flat=True)

    periods = []
    for period in timetable.periods.select_related('subject', 'teacher'):
        status_info = "present"
        if period.teacher_id in absent_staff_ids:
            status_info = "absent"
        
        periods.append({
            "period_number": period.period_number,
            "subject": period.subject.name if period.subject else "None",
            "teacher": period.teacher.get_full_name() if period.teacher else "None",
            "status": status_info,
            "start_time": period.start_time.strftime("%H:%M"),
            "end_time": period.end_time.strftime("%H:%M")
        })

    return Response({
        "class_name": class_name_input,
        "day": day_name,
        "date": today.isoformat(),
        "periods": periods
    }, status=status.HTTP_200_OK)


# ─── Course Sessions ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def course_session_list_view(request):
    """
    GET  — List course sessions with optional filters.
    POST — Create a new course session.
    """
    try:
        if request.method == "GET":
            qs = CourseSession.objects.select_related(
                "academic_year", "section", "section__school_class",
                "subject", "teacher", "created_by"
            ).all()

            # Scope by school
            user = request.user
            if not user.is_superuser and user.school:
                qs = qs.filter(section__school_class__school=user.school)

            # Filters
            ay_id      = request.query_params.get("academic_year")
            section_id = request.query_params.get("section")
            subject_id = request.query_params.get("subject")
            teacher_id = request.query_params.get("teacher")
            status_f   = request.query_params.get("status")
            date_from  = request.query_params.get("date_from")
            date_to    = request.query_params.get("date_to")
            date_exact = request.query_params.get("date")

            if ay_id:       qs = qs.filter(academic_year_id=ay_id)
            if section_id:  qs = qs.filter(section_id=section_id)
            if subject_id:  qs = qs.filter(subject_id=subject_id)
            if teacher_id:  qs = qs.filter(teacher_id=teacher_id)
            if status_f:    qs = qs.filter(status=status_f)
            if date_exact:  qs = qs.filter(date=date_exact)
            if date_from:   qs = qs.filter(date__gte=date_from)
            if date_to:     qs = qs.filter(date__lte=date_to)

            serializer = CourseSessionSerializer(qs, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # POST — Create
        data = request.data.copy()
        serializer = CourseSessionSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        session = serializer.save(created_by=request.user)
        return Response(CourseSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def course_session_detail_view(request, pk):
    """
    GET    — Retrieve a single session.
    PATCH  — Partial update (e.g. change status).
    DELETE — Remove the session.
    """
    try:
        try:
            session = CourseSession.objects.select_related(
                "academic_year", "section", "section__school_class",
                "subject", "teacher", "created_by"
            ).get(pk=pk)
        except CourseSession.DoesNotExist:
            return Response({"error": "Course session not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(CourseSessionSerializer(session).data, status=status.HTTP_200_OK)

        if request.method == "PATCH":
            serializer = CourseSessionSerializer(session, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        session.delete()
        return Response({"message": "Session deleted."}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_submissions_view(request):
    """
    Returns all homework/assignment submissions for the currently authenticated student.
    Used for the Results Center to show graded items.
    """
    try:
        from apps.students.models import Student
        student = Student.objects.filter(user=request.user).first()
        if not student:
            return Response({"error": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = HomeworkSubmission.objects.select_related(
            "homework", "homework__subject", "homework__assigned_by"
        ).filter(student=student).order_by("-submitted_at")
        
        # Optionally filter for graded only if requested
        if request.query_params.get("graded_only") == "true":
            qs = qs.exclude(grade="")

        serializer = HomeworkSubmissionSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
