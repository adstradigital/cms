import uuid
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum, Max
from apps.students.models import Student
from .models import FeeCategory, FeeStructure, FeeInstalment, FeePayment, Concession, StudentConcession, Donation, AnnualBudget, BudgetItem
from .serializers import (
    FeeCategorySerializer, FeeStructureSerializer, FeeInstalmentSerializer,
    FeePaymentSerializer, FeePaymentCreateSerializer,
    ConcessionSerializer, StudentConcessionSerializer,
)


# ─── Fee Category (Fee Heads) ─────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_category_list_view(request):
    try:
        if request.method == "GET":
            qs = FeeCategory.objects.all().order_by("fee_type", "name")
            return Response(FeeCategorySerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = FeeCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def fee_category_detail_view(request, pk):
    try:
        try:
            category = FeeCategory.objects.get(pk=pk)
        except FeeCategory.DoesNotExist:
            return Response({"error": "Fee category not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(FeeCategorySerializer(category).data, status=status.HTTP_200_OK)
        if request.method == "PATCH":
            serializer = FeeCategorySerializer(category, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        category.delete()
        return Response({"message": "Category deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Fee Structure ────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_structure_list_view(request):
    try:
        if request.method == "GET":
            academic_year_id = request.query_params.get("academic_year")
            class_id = request.query_params.get("class")
            qs = FeeStructure.objects.select_related(
                "academic_year", "school_class", "category"
            ).prefetch_related("instalments").all()
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            if class_id:
                qs = qs.filter(school_class_id=class_id)
            return Response(FeeStructureSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = FeeStructureSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def fee_structure_detail_view(request, pk):
    try:
        try:
            structure = FeeStructure.objects.select_related(
                "academic_year", "school_class", "category"
            ).prefetch_related("instalments").get(pk=pk)
        except FeeStructure.DoesNotExist:
            return Response({"error": "Fee structure not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(FeeStructureSerializer(structure).data, status=status.HTTP_200_OK)
        if request.method == "PATCH":
            serializer = FeeStructureSerializer(structure, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        structure.delete()
        return Response({"message": "Fee structure deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def copy_fee_structure_view(request):
    """
    Copy all fee structures from one class to another, with optional % adjustment.
    Body: { from_class, to_class, academic_year, increase_percent (optional) }
    """
    try:
        from_class_id = request.data.get("from_class")
        to_class_id = request.data.get("to_class")
        academic_year_id = request.data.get("academic_year")
        increase_percent = Decimal(str(request.data.get("increase_percent", 0)))

        if not all([from_class_id, to_class_id, academic_year_id]):
            return Response({"error": "from_class, to_class and academic_year are required."}, status=status.HTTP_400_BAD_REQUEST)

        source = FeeStructure.objects.filter(
            school_class_id=from_class_id,
            academic_year_id=academic_year_id,
        ).select_related("category")

        if not source.exists():
            return Response({"error": "No structures found for source class."}, status=status.HTTP_404_NOT_FOUND)

        created = []
        for s in source:
            new_amount = s.amount
            if increase_percent:
                new_amount = s.amount * (1 + increase_percent / 100)

            new_s, _ = FeeStructure.objects.get_or_create(
                school_class_id=to_class_id,
                academic_year_id=academic_year_id,
                category=s.category,
                defaults={
                    "amount": round(new_amount, 2),
                    "due_date": s.due_date,
                    "term": s.term,
                    "is_mandatory": s.is_mandatory,
                    "late_fine_per_day": s.late_fine_per_day,
                }
            )
            created.append(new_s)

        return Response(FeeStructureSerializer(created, many=True).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Fee Instalments ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_instalment_list_view(request):
    try:
        if request.method == "GET":
            structure_id = request.query_params.get("fee_structure")
            qs = FeeInstalment.objects.all()
            if structure_id:
                qs = qs.filter(fee_structure_id=structure_id)
            return Response(FeeInstalmentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = FeeInstalmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def fee_instalment_detail_view(request, pk):
    try:
        instalment = FeeInstalment.objects.get(pk=pk)
        if request.method == "PATCH":
            serializer = FeeInstalmentSerializer(instalment, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        instalment.delete()
        return Response({"message": "Instalment deleted."}, status=status.HTTP_204_NO_CONTENT)
    except FeeInstalment.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Concessions ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def concession_list_view(request):
    try:
        if request.method == "GET":
            return Response(ConcessionSerializer(Concession.objects.all(), many=True).data)
        serializer = ConcessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def concession_detail_view(request, pk):
    try:
        obj = Concession.objects.get(pk=pk)
        if request.method == "GET":
            return Response(ConcessionSerializer(obj).data)
        if request.method == "PATCH":
            ser = ConcessionSerializer(obj, data=request.data, partial=True)
            if not ser.is_valid():
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
            ser.save()
            return Response(ser.data)
        obj.delete()
        return Response({"message": "Deleted."}, status=status.HTTP_204_NO_CONTENT)
    except Concession.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_concession_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            academic_year_id = request.query_params.get("academic_year")
            qs = StudentConcession.objects.select_related("student", "student__user", "concession", "approved_by")
            if student_id:
                qs = qs.filter(student_id=student_id)
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            return Response(StudentConcessionSerializer(qs, many=True).data)

        serializer = StudentConcessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(approved_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def student_concession_detail_view(request, pk):
    try:
        obj = StudentConcession.objects.get(pk=pk)
        obj.delete()
        return Response({"message": "Concession revoked."}, status=status.HTTP_204_NO_CONTENT)
    except StudentConcession.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Fee Payment ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_payment_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            pay_status = request.query_params.get("status")
            academic_year_id = request.query_params.get("academic_year")
            class_id = request.query_params.get("class")

            qs = FeePayment.objects.select_related(
                "student", "student__user",
                "fee_structure", "fee_structure__category",
                "fee_structure__school_class",
                "collected_by",
            ).all().order_by("-created_at")

            if student_id:
                qs = qs.filter(student_id=student_id)
            if pay_status:
                qs = qs.filter(status=pay_status)
            if academic_year_id:
                qs = qs.filter(fee_structure__academic_year_id=academic_year_id)
            if class_id:
                qs = qs.filter(fee_structure__school_class_id=class_id)

            return Response(FeePaymentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

        serializer = FeePaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payment = serializer.save(
            collected_by=request.user,
            status="paid",
            receipt_number=f"RCP-{uuid.uuid4().hex[:8].upper()}",
        )
        return Response(FeePaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def fee_payment_detail_view(request, pk):
    try:
        try:
            payment = FeePayment.objects.select_related(
                "student", "student__user",
                "fee_structure", "fee_structure__category",
                "collected_by",
            ).get(pk=pk)
        except FeePayment.DoesNotExist:
            return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return Response(FeePaymentSerializer(payment).data, status=status.HTTP_200_OK)

        serializer = FeePaymentCreateSerializer(payment, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(FeePaymentSerializer(payment).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Student Fee Statement ────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_fee_statement_view(request, student_id):
    """Full fee statement for a student — all structures, paid vs due."""
    try:
        try:
            student = Student.objects.select_related(
                "user", "section__school_class", "academic_year"
            ).get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        academic_year_id = request.query_params.get("academic_year", student.academic_year_id)

        structures = FeeStructure.objects.filter(
            school_class=student.section.school_class,
            academic_year_id=academic_year_id,
        ).select_related("category")

        payments = FeePayment.objects.filter(
            student=student,
            fee_structure__academic_year_id=academic_year_id,
        ).select_related("fee_structure", "fee_structure__category", "collected_by")

        total_fee = sum(s.amount for s in structures)
        total_paid = sum(p.amount_paid for p in payments if p.status == "paid")
        total_due = total_fee - total_paid

        # Build per-structure dues breakdown
        paid_by_structure = {}
        for p in payments:
            if p.status == "paid":
                paid_by_structure.setdefault(p.fee_structure_id, Decimal("0"))
                paid_by_structure[p.fee_structure_id] += p.amount_paid

        fee_dues = []
        for s in structures:
            struct_paid = paid_by_structure.get(s.id, Decimal("0"))
            balance = s.amount - struct_paid
            fee_dues.append({
                "fee_structure": s.id,
                "category_name": s.category.name,
                "category_type": s.category.fee_type,
                "total_amount": float(s.amount),
                "amount_paid": float(struct_paid),
                "balance_due": float(max(Decimal("0"), balance)),
                "due_date": str(s.due_date),
                "term": s.term,
                "is_mandatory": s.is_mandatory,
            })

        return Response({
            "student_id": student.id,
            "student_name": student.user.get_full_name(),
            "admission_number": student.admission_number,
            "academic_year": student.academic_year.name if student.academic_year else None,
            "total_fee": total_fee,
            "total_paid": total_paid,
            "total_due": max(Decimal("0"), total_due),
            "fee_dues": fee_dues,
            "payments": FeePaymentSerializer(payments, many=True).data,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Defaulters ───────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_defaulters_view(request):
    """List students with outstanding dues."""
    try:
        academic_year_id = request.query_params.get("academic_year")
        class_id = request.query_params.get("class")
        section_id = request.query_params.get("section")

        qs = FeePayment.objects.filter(status__in=["pending", "overdue"]).select_related(
            "student", "student__user",
            "fee_structure", "fee_structure__category",
            "fee_structure__school_class",
        )
        if academic_year_id:
            qs = qs.filter(fee_structure__academic_year_id=academic_year_id)
        if class_id:
            qs = qs.filter(student__section__school_class_id=class_id)
        if section_id:
            qs = qs.filter(student__section_id=section_id)

        return Response(FeePaymentSerializer(qs, many=True).data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Section Fee Overview ─────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_section_overview_view(request):
    """Section fee snapshot: per-student due based on structures vs paid."""
    try:
        section_id = request.query_params.get("section")
        if not section_id:
            return Response({"error": "section is required."}, status=status.HTTP_400_BAD_REQUEST)

        students = Student.objects.select_related("user", "section", "section__school_class", "academic_year").filter(
            section_id=section_id,
            is_active=True,
        )
        students_list = list(students)
        if not students_list:
            return Response({"section": int(section_id), "students": []}, status=status.HTTP_200_OK)

        class_id = students_list[0].section.school_class_id if students_list[0].section else None
        academic_year_id = request.query_params.get("academic_year") or students_list[0].academic_year_id

        structures = FeeStructure.objects.filter(
            school_class_id=class_id,
            academic_year_id=academic_year_id,
        )
        total_fee = structures.aggregate(total=Sum("amount"))["total"] or Decimal("0")

        paid_by_student = FeePayment.objects.filter(
            student_id__in=[s.id for s in students_list],
            fee_structure__academic_year_id=academic_year_id,
            status="paid",
        ).values("student_id").annotate(
            total_paid=Sum("amount_paid"),
            last_payment=Max("payment_date"),
        )
        paid_map = {row["student_id"]: row for row in paid_by_student}

        out = []
        for s in students_list:
            row = paid_map.get(s.id, {})
            total_paid = row.get("total_paid") or Decimal("0")
            due = total_fee - total_paid
            if due < 0:
                due = Decimal("0")
            out.append({
                "student_id": s.id,
                "student_name": s.user.get_full_name() or s.user.username,
                "roll_number": s.roll_number,
                "admission_number": s.admission_number,
                "total_fee": total_fee,
                "total_paid": total_paid,
                "total_due": due,
                "last_payment_date": row.get("last_payment"),
            })

        return Response({
            "section": int(section_id),
            "academic_year": academic_year_id,
            "total_fee": total_fee,
            "students": out,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Email Receipt ────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_receipt_email_view(request, pk):
    """Email a payment receipt to the student/parent."""
    try:
        try:
            payment = FeePayment.objects.select_related(
                "student", "student__user", "student__user__school",
                "fee_structure", "fee_structure__category",
                "collected_by",
            ).get(pk=pk)
        except FeePayment.DoesNotExist:
            return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        email_to = request.data.get("email") or payment.student.user.email
        if not email_to:
            return Response({"error": "No email address available for this student."}, status=status.HTTP_400_BAD_REQUEST)

        school = payment.student.user.school
        school_name = school.name if school else "Campus Management System"
        school_address = school.address if school else ""
        school_phone = school.phone if school else ""

        subject = f"Fee Payment Receipt – {payment.receipt_number}"
        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f7fa;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#091426;color:#fff;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:900;letter-spacing:0.5px;">{school_name}</div>
      <div style="font-size:13px;opacity:0.7;margin-top:4px;">Fee Payment Receipt</div>
    </div>
    <div style="padding:28px 32px;">
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:4px;margin-bottom:24px;">
        <div style="font-size:12px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payment Confirmed</div>
        <div style="font-size:28px;font-weight:900;color:#15803d;margin-top:4px;">₹{payment.amount_paid:,.2f}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Receipt No.</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:700;font-family:monospace;">{payment.receipt_number}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Student Name</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:600;">{payment.student.user.get_full_name()}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Admission No.</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">{payment.student.admission_number}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Fee Head</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">{payment.fee_structure.category.name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Payment Method</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">{payment.payment_method.upper()}</td></tr>
        {f'<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-weight:600;">Transaction ID</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-family:monospace;">{payment.transaction_id}</td></tr>' if payment.transaction_id else ''}
        <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Date of Payment</td><td style="padding:10px 0;">{payment.payment_date}</td></tr>
      </table>
      <div style="margin-top:28px;padding-top:20px;border-top:1px dashed #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
        This is a computer-generated receipt and does not require a physical signature.<br>
        {school_address}{' · ' if school_address and school_phone else ''}{school_phone}
      </div>
    </div>
  </div>
</body>
</html>"""

        plain_body = (
            f"Receipt No: {payment.receipt_number}\n"
            f"Student: {payment.student.user.get_full_name()} ({payment.student.admission_number})\n"
            f"Fee Head: {payment.fee_structure.category.name}\n"
            f"Amount Paid: ₹{payment.amount_paid}\n"
            f"Payment Method: {payment.payment_method.upper()}\n"
            f"Date: {payment.payment_date}\n\n"
            f"This is a computer-generated receipt.\n{school_name}"
        )

        send_mail(
            subject=subject,
            message=plain_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@school.com"),
            recipient_list=[email_to],
            html_message=html_body,
            fail_silently=False,
        )
        return Response({"message": f"Receipt sent to {email_to}."}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Donations ────────────────────────────────────────────────────────────────

from rest_framework import serializers as ser_module

class DonationSerializer(ser_module.ModelSerializer):
    recorded_by_name = ser_module.CharField(source="recorded_by.get_full_name", read_only=True)
    academic_year_name = ser_module.CharField(source="academic_year.name", read_only=True)
    class Meta:
        model = Donation
        fields = "__all__"
        read_only_fields = ["recorded_by"]

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def donation_list_view(request):
    try:
        if request.method == "GET":
            return Response(DonationSerializer(Donation.objects.select_related("academic_year", "recorded_by").all(), many=True).data)
        s = DonationSerializer(data=request.data)
        if not s.is_valid(): return Response(s.errors, status=400)
        s.save(recorded_by=request.user)
        return Response(s.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def donation_detail_view(request, pk):
    try:
        obj = Donation.objects.get(pk=pk)
        if request.method == "GET": return Response(DonationSerializer(obj).data)
        if request.method == "PATCH":
            s = DonationSerializer(obj, data=request.data, partial=True)
            if not s.is_valid(): return Response(s.errors, status=400)
            s.save(); return Response(s.data)
        obj.delete(); return Response({"message": "Deleted."}, status=204)
    except Donation.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Annual Budget & Budget Items ─────────────────────────────────────────────

class BudgetItemSerializer(ser_module.ModelSerializer):
    variance = ser_module.SerializerMethodField()
    class Meta:
        model = BudgetItem
        fields = "__all__"
    def get_variance(self, obj): return float(obj.variance)

class AnnualBudgetSerializer(ser_module.ModelSerializer):
    academic_year_name = ser_module.CharField(source="academic_year.name", read_only=True)
    approved_by_name = ser_module.CharField(source="approved_by.get_full_name", read_only=True)
    class Meta:
        model = AnnualBudget
        fields = "__all__"

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def annual_budget_list_view(request):
    try:
        if request.method == "GET":
            return Response(AnnualBudgetSerializer(AnnualBudget.objects.select_related("academic_year", "approved_by").all(), many=True).data)
        s = AnnualBudgetSerializer(data=request.data)
        if not s.is_valid(): return Response(s.errors, status=400)
        s.save(); return Response(s.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def annual_budget_detail_view(request, pk):
    try:
        obj = AnnualBudget.objects.get(pk=pk)
        if request.method == "GET": return Response(AnnualBudgetSerializer(obj).data)
        s = AnnualBudgetSerializer(obj, data=request.data, partial=True)
        if not s.is_valid(): return Response(s.errors, status=400)
        s.save(); return Response(s.data)
    except AnnualBudget.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def budget_items_view(request, pk):
    try:
        items = BudgetItem.objects.filter(budget_id=pk)
        return Response(BudgetItemSerializer(items, many=True).data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def budget_item_create_view(request):
    try:
        s = BudgetItemSerializer(data=request.data)
        if not s.is_valid(): return Response(s.errors, status=400)
        s.save(); return Response(s.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def budget_item_detail_view(request, pk):
    try:
        obj = BudgetItem.objects.get(pk=pk)
        if request.method == "PATCH":
            s = BudgetItemSerializer(obj, data=request.data, partial=True)
            if not s.is_valid(): return Response(s.errors, status=400)
            s.save(); return Response(s.data)
        obj.delete(); return Response({"message": "Deleted."}, status=204)
    except BudgetItem.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
