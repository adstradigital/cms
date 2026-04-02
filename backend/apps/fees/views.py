import uuid
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.students.models import Student
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

        qs = FeePayment.objects.filter(status__in=["pending", "overdue"]).select_related(
            "student", "student__user",
            "fee_structure", "fee_structure__category",
        )
        if academic_year_id:
            qs = qs.filter(fee_structure__academic_year_id=academic_year_id)
        if class_id:
            qs = qs.filter(student__section__school_class_id=class_id)

        return Response(FeePaymentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
