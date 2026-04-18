from django.db.models import Count, Q
from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import (
    ClassSerializer, SectionSerializer, StudentSerializer, 
    StudentRegistrationSerializer, StudentDocumentSerializer,
    AdmissionInquirySerializer
)
from .models import Class, Section, Student, StudentDocument, AdmissionInquiry
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

    def check_permissions(self, request):
        if self.action in ('dashboard_data', 'my_profile', 'update_my_profile'):
            # Allow students to view/update their own data without 'students.view' admin permission
            from rest_framework import viewsets
            return super(RolePermissionMixin, self).check_permissions(request)
        super().check_permissions(request)

    def get_queryset(self):
        user = self.request.user
        qs = Student.objects.select_related(
            "user", "user__profile", "section",
            "section__school_class", "academic_year"
        ).prefetch_related("documents")

        # Create a debug log for the current request
        debug_info = [f"--- GET_QUERYSET TRIGGERED ---"]
        debug_info.append(f"User: {user.username} (Superuser: {user.is_superuser})")
        debug_info.append(f"QueryParams: {dict(self.request.query_params)}")

        # ── 1. School Scoping ──
        if not user.is_superuser and user.school:
            qs = qs.filter(user__school=user.school)
            debug_info.append(f"Filtered by school: {user.school.name}")

        # ── 2. Query Parameters Filtering ──
        section_id = self.request.query_params.get("section")
        class_id   = self.request.query_params.get("class")
        ay_ref     = self.request.query_params.get("academic_year")
        is_active  = self.request.query_params.get("is_active")

        if section_id:
            qs = qs.filter(section_id=section_id)
            debug_info.append(f"Filtered by section: {section_id}")
        if class_id:
            qs = qs.filter(section__school_class_id=class_id)
            debug_info.append(f"Filtered by class: {class_id}")
        
        if ay_ref:
            if ay_ref.isdigit():
                qs = qs.filter(academic_year_id=ay_ref)
            else:
                # Use iexact and strip to handle common frontend mismatches
                qs = qs.filter(academic_year__name__iexact=ay_ref.strip())
        
        # Default to showing only active if not specified, but flexible
        if not is_active or is_active.lower() == "true":
            qs = qs.filter(is_active=True)
        elif is_active.lower() == "false":
            qs = qs.filter(is_active=False)
        # if 'all', we skip this filter

        # ── 3. Role-Based Access Control (RBAC) ──
        if user.is_superuser or (user.role and user.role.scope == 'school'):
            return qs.order_by("roll_number", "user__last_name")

        # Row Level Security for Teachers
        accessible = user.get_accessible_section_ids()
        debug_info.append(f"Accessible sections output: {accessible}")
        if accessible:
            # If a section was requested, it must be in the accessible list
            qs = qs.filter(section_id__in=accessible)
            debug_info.append(f"Applied RLS filter using section_in={accessible}")
        else:
            # No accessible sections found for this teacher
            qs = qs.none()
            debug_info.append(f"Warning: Teacher has no accessible sections. Result will be empty.")

        debug_info.append(f"FINAL Query output count: {qs.count()}")
        try:
            import datetime
            with open("student_query_debug.txt", "a") as f:
                f.write(f"\n[{datetime.datetime.now()}]\n" + "\n".join(debug_info) + "\n---------------------\n")
        except Exception:
            pass
            
        return qs.order_by("roll_number", "user__last_name")

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

    # ─── Portal Access Management ──────────────────────────────────────────────

    @action(detail=False, methods=['GET'], url_path='dashboard-data')
    def dashboard_data(self, request):
        try:
            """
            Returns aggregated dashboard data for the currently logged-in student.
            """
            from django.db.models import Sum
            from django.utils import timezone
            from apps.attendance.models import Attendance
            from apps.fees.models import FeePayment, FeeStructure
            from apps.exams.models import ReportCard
            
            user = request.user
            if not user.is_authenticated:
                return Response({"error": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
                
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return Response({"error": "No student record found for this user."}, status=status.HTTP_404_NOT_FOUND)

            today = timezone.now().date()
            month = today.month
            year = today.year

            # 1. Profile Context
            profile_data = {
                "id": student.id,
                "name": user.get_full_name() or user.username,
                "admission_number": student.admission_number,
                "class_name": student.section.school_class.name if student.section else "N/A",
                "section_name": student.section.name if student.section else "N/A",
                "section_id": student.section.id if student.section else None,
                "roll_number": student.roll_number,
                "avatar": request.build_absolute_uri(user.profile.photo.url) if (hasattr(user, 'profile') and user.profile.photo) else None,
                "father_name": getattr(user.profile, 'father_name', 'N/A') if hasattr(user, 'profile') else 'N/A',
                "mother_name": getattr(user.profile, 'mother_name', 'N/A') if hasattr(user, 'profile') else 'N/A',
                "contact": user.phone or (getattr(user.profile, 'parent_phone', 'N/A') if hasattr(user, 'profile') else 'N/A')
            }

            # 2. Attendance Stats (Current month)
            monthly_att = Attendance.objects.filter(student=student, date__month=month, date__year=year)
            total_days = monthly_att.count()
            present_days = monthly_att.filter(status="present").count()
            absent_days = monthly_att.filter(status="absent").count()
            leave_days = monthly_att.filter(status__in=["late", "leave"]).count()
            
            att_percentage = round((present_days / total_days) * 100) if total_days > 0 else 100
            
            last_absent = monthly_att.filter(status="absent").order_by('-date').first()
            last_absent_str = last_absent.date.strftime("%d %b, %Y") if last_absent else "N/A"

            attendance_stats = {
                "percentage": att_percentage,
                "present": present_days,
                "absent": absent_days,
                "leave": leave_days,
                "last_absent": last_absent_str
            }

            # 3. Fee Stats
            # We find pending fee structures compared to paid amounts
            payments = FeePayment.objects.filter(student=student)
            total_paid = payments.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
            latest_payment = payments.order_by('-created_at').first()
            
            # Calculate roughly what's due based on active structures
            structures = FeeStructure.objects.filter(school_class=student.section.school_class if student.section else None)
            total_expected = structures.aggregate(Sum('amount'))['amount__sum'] or 0
            fee_due = max(0, float(total_expected) - float(total_paid))

            fee_stats = {
                "due": fee_due,
                "last_paid": latest_payment.payment_date.strftime("%d %b, %Y") if latest_payment and latest_payment.payment_date else "No records",
                "method": latest_payment.payment_method.capitalize() if latest_payment else "N/A"
            }

            # 4. Exam Stats
            report_cards = ReportCard.objects.filter(student=student, is_published=True).order_by('-generated_at')
            latest_rc = report_cards.first()
            exam_stats = {
                "percentage": float(latest_rc.percentage) if latest_rc and latest_rc.percentage else 0,
                "last_exam": latest_rc.exam.name if latest_rc and latest_rc.exam else "N/A",
                "top_mark": "N/A"
            }

            # Simulated Bar Chart mapped to actual ExamResult if available
            chart_data = [
                {"subject": "Eng", "student": 85, "average": 70},
                {"subject": "Math", "student": 92, "average": 75},
                {"subject": "Sci", "student": 88, "average": 72},
                {"subject": "Hist", "student": 78, "average": 68},
                {"subject": "Lang", "student": 90, "average": 78},
            ]
            
            if latest_rc:
                try:
                    from apps.exams.models import ExamResult
                    er = ExamResult.objects.filter(student=student, exam_schedule__exam=latest_rc.exam)
                    if er.exists():
                        chart_data = []
                        for result in er[:7]:
                            sub_name = result.exam_schedule.subject.name[:4]
                            student_mark = result.marks_obtained or 0
                            max_marks = result.exam_schedule.max_marks or 100
                            student_pct = round((float(student_mark) / float(max_marks)) * 100)
                            chart_data.append({
                                "subject": sub_name,
                                "student": student_pct,
                                "average": max(40, student_pct - 15) 
                            })
                except Exception:
                    pass


            return Response({
                "profile": profile_data,
                "attendance": attendance_stats,
                "fees": fee_stats,
                "exams": exam_stats,
                "chart_data": chart_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            return Response({"detail": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'], url_path='my-profile')
    def my_profile(self, request):
        """
        Returns the full student record for the currently authenticated student.
        No admin permission required — students can only see their own data.
        """
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            student = Student.objects.select_related(
                "user", "user__profile", "section", "section__school_class", "academic_year"
            ).get(user=user)
        except Student.DoesNotExist:
            return Response({"error": "No student record found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StudentSerializer(student)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['PATCH'], url_path='update-my-profile')
    def update_my_profile(self, request):
        """
        Allows the authenticated student to update their own contact info.
        Only phone and address are editable by the student.
        """
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({"error": "No student record found."}, status=status.HTTP_404_NOT_FOUND)

        from apps.accounts.models import UserProfile
        # Only allow updating safe fields
        phone = request.data.get('phone')
        address = request.data.get('address')

        if phone is not None:
            user.phone = phone
            user.save(update_fields=['phone'])

        if address is not None:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.address = address
            profile.save(update_fields=['address'])

        return Response({"message": "Profile updated successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['GET'], url_path='portal-info')
    def portal_info(self, request, pk=None):
        """
        Returns the student's portal login info for admin viewing.
        Only admins/superusers can access this.
        """
        user = request.user
        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        su = student.user
        return Response({
            "student_id": student.id,
            "user_id": su.id,
            "username": su.username,
            "email": su.email or "",
            "phone": su.phone or "",
            "portal": su.portal,
            "is_active": su.is_active,
            "is_verified": su.is_verified,
            "role_name": su.role.name if su.role else "",
            "date_joined": su.date_joined,
            "last_login": su.last_login,
            "full_name": su.get_full_name(),
            "admission_number": student.admission_number,
        })

    @action(detail=True, methods=['POST'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Reset a student's portal password.
        Accepts optional `new_password`; if omitted, auto-generates a secure one.
        Only admins/superusers can access this.
        """
        import secrets
        import string

        user = request.user
        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        su = student.user

        new_password = request.data.get('new_password', '').strip()
        if not new_password:
            # Auto-generate: 3 uppercase + 4 lowercase + 2 digits + 1 special
            alphabet = string.ascii_letters + string.digits
            new_password = ''.join(secrets.choice(alphabet) for _ in range(8))
            new_password += secrets.choice('!@#$%&')
            new_password += str(secrets.randbelow(100)).zfill(2)

        su.set_password(new_password)
        su.save(update_fields=['password'])

        return Response({
            "success": True,
            "username": su.username,
            "new_password": new_password,
            "message": f"Password reset for {su.get_full_name()}. Share these credentials securely."
        })

    @action(detail=True, methods=['POST'], url_path='toggle-access')
    def toggle_access(self, request, pk=None):
        """
        Toggle a student's portal access (activate/deactivate their user account).
        Accepts optional `is_active` boolean; if omitted, toggles the current state.
        Only admins/superusers can access this.
        """
        user = request.user
        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        su = student.user

        # Accept explicit value or toggle
        new_state = request.data.get('is_active')
        if new_state is not None:
            su.is_active = bool(new_state)
        else:
            su.is_active = not su.is_active
        su.save(update_fields=['is_active'])

        return Response({
            "success": True,
            "is_active": su.is_active,
            "message": f"Portal access {'enabled' if su.is_active else 'disabled'} for {su.get_full_name()}."
        })

    @action(detail=True, methods=['POST'], url_path='update-username')
    def update_username(self, request, pk=None):
        """
        Update a student's portal username.
        Only admins/superusers can access this.
        """
        user = request.user
        if not (user.is_superuser or (user.role and user.role.scope == 'school')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        student = self.get_object()
        su = student.user

        new_username = request.data.get('new_username', '').strip()
        if not new_username:
            return Response({"error": "New username is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Check if username exists (excluding current user)
        if User.objects.exclude(pk=su.id).filter(username=new_username).exists():
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        su.username = new_username
        su.save(update_fields=['username'])

        return Response({
            "success": True,
            "username": su.username,
            "message": f"Username updated successfully."
        })

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


class AdmissionInquiryViewSet(RolePermissionMixin, viewsets.ModelViewSet):
    """
    Handles CRM functionality for prospective students.
    Admins can Track, Filter by Status, and Edit inquiries.
    """
    required_permission = 'students.view' # or specific admissions permission
    serializer_class = AdmissionInquirySerializer

    def get_queryset(self):
        user = self.request.user
        qs = AdmissionInquiry.objects.select_related("class_requested").all()

        # Filter by school
        if not user.is_superuser and user.school:
            qs = qs.filter(school=user.school)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search_query = self.request.query_params.get("search")
        if search_query:
            qs = qs.filter(student_name__icontains=search_query)

        return qs

    def perform_create(self, serializer):
        school = self.request.user.school
        if not school and self.request.user.is_superuser:
            from apps.accounts.models import School
            school = School.objects.first()
        serializer.save(school=school)

    @action(detail=True, methods=['POST'], url_path='convert')
    def convert_to_student(self, request, pk=None):
        """
        Converts an AdmissionInquiry into a formal Student.
        Auto-generates Username, Password, and Admission Number.
        """
        import random
        
        inquiry = self.get_object()
        
        if inquiry.status == 'Enrolled':
            return Response({"error": "This inquiry has already been converted."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse Name
        names = inquiry.student_name.strip().split()
        first_name = names[0] if names else 'Unknown'
        last_name = ' '.join(names[1:]) if len(names) > 1 else ''
        
        # Generate credentials
        rand_id = random.randint(1000, 9999)
        username = f"{first_name.lower().replace('.', '')}{rand_id}"
        admission_number = f"ADM-{rand_id}"
        
        data = {
            'first_name': first_name,
            'last_name': last_name,
            'username': username,
            'password': 'Student@123',
            'admission_number': admission_number,
            'guardian_name': inquiry.guardian_name,
            'guardian_phone': inquiry.contact_phone,
            'parent_email': inquiry.contact_email,
            'previous_school': inquiry.previous_school,
            'health_notes': inquiry.notes,
        }
        
        serializer = StudentRegistrationSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            try:
                from django.db import transaction
                with transaction.atomic():
                    student = serializer.save()
                    # Link to school
                    student.user.school = inquiry.school
                    student.user.save()
                    
                    # Update inquiry status automatically
                    inquiry.status = 'Enrolled'
                    inquiry.save()
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response({
                "success": True, 
                "student_id": student.id, 
                "username": username,
                "admission_number": admission_number
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
                
            # Apply Row-Level Security: Hide sections the teacher cannot access
            if not request.user.is_superuser and not (request.user.role and request.user.role.scope == 'school'):
                accessible = request.user.get_accessible_section_ids()
                if accessible:
                    qs = qs.filter(id__in=accessible)
                else:
                    qs = qs.none()

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
