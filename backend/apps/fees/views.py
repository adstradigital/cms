import uuid
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.students.models import Student
from django.db.models import Sum, Max
from .models import FeeCategory, FeeStructure, FeePayment
from .serializers import (
    FeeCategorySerializer, FeeStructureSerializer,
    FeePaymentSerializer, FeePaymentCreateSerializer,
)


# ─── Fee Category ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_category_list_view(request):
    try:
        if request.method == "GET":
            qs = FeeCategory.objects.all()
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
            ).all()
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
            ).get(pk=pk)
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


# ─── Fee Payment ──────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fee_payment_list_view(request):
    try:
        if request.method == "GET":
            student_id = request.query_params.get("student")
            pay_status = request.query_params.get("status")
            academic_year_id = request.query_params.get("academic_year")

            qs = FeePayment.objects.select_related(
                "student", "student__user",
                "fee_structure", "fee_structure__category",
                "collected_by",
            ).all()

            if student_id:
                qs = qs.filter(student_id=student_id)
            if pay_status:
                qs = qs.filter(status=pay_status)
            if academic_year_id:
                qs = qs.filter(fee_structure__academic_year_id=academic_year_id)

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

        return Response({
            "student_id": student.id,
            "student_name": student.user.get_full_name(),
            "admission_number": student.admission_number,
            "academic_year": student.academic_year.name if student.academic_year else None,
            "total_fee": total_fee,
            "total_paid": total_paid,
            "total_due": max(Decimal("0"), total_due),
            "payments": FeePaymentSerializer(payments, many=True).data,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_section_overview_view(request):
    """
    Section fee snapshot: per-student due based on structures vs paid.
    Query params: section (required), academic_year (optional)
    """
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
