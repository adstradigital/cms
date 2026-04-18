import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.students.models import Student
from django.utils import timezone

try:
    user = User.objects.get(username='student_test')
    student = Student.objects.get(user=user)
    
    today = timezone.now().date()
    month = today.month
    year = today.year

    profile_data = {
        "name": user.get_full_name() or user.username,
        "admission_number": student.admission_number,
        "class_name": student.section.school_class.name if student.section else "N/A",
        "section_name": student.section.name if student.section else "N/A",
        "roll_number": student.roll_number,
        "avatar": user.profile.photo.url if (hasattr(user, 'profile') and user.profile.photo) else None,
        "father_name": getattr(user.profile, 'father_name', 'N/A') if hasattr(user, 'profile') else 'N/A',
        "mother_name": getattr(user.profile, 'mother_name', 'N/A') if hasattr(user, 'profile') else 'N/A',
        "contact": user.phone or (getattr(user.profile, 'parent_phone', 'N/A') if hasattr(user, 'profile') else 'N/A')
    }
    print("Profile OK", profile_data)
    
    from apps.attendance.models import Attendance
    from apps.fees.models import FeePayment, FeeStructure
    from apps.exams.models import ReportCard
    from django.db.models import Sum

    monthly_att = Attendance.objects.filter(student=student, date__month=month, date__year=year)
    total_days = monthly_att.count()
    print("Attendance OK")

    payments = FeePayment.objects.filter(student=student)
    total_paid = payments.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
    latest_payment = payments.order_by('-created_at').first()
    print("Fee Payments OK")
    
    structures = FeeStructure.objects.filter(school_class=student.section.school_class if student.section else None)
    total_expected = structures.aggregate(Sum('amount'))['amount__sum'] or 0
    print("Fee Structures OK")

    report_cards = ReportCard.objects.filter(student=student, is_published=True).order_by('-created_at')
    latest_rc = report_cards.first()
    print("Reports OK")

    if latest_rc:
        from apps.exams.models import ExamResult
        er = ExamResult.objects.filter(student=student, exam_schedule__exam=latest_rc.exam)
        print("Er exists?", er.exists())

    print("ALL OK")
except Exception as e:
    import traceback
    traceback.print_exc()
