import django.utils.timezone as tz
from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.staff.models import Staff
from .models import SalaryStructure, DeductionType, PayrollRun, PayrollEntry
from .serializers import (
    SalaryStructureSerializer, DeductionTypeSerializer,
    PayrollRunSerializer, PayrollRunListSerializer, PayrollEntrySerializer,
)


# ─── Salary Structure ─────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def salary_structure_list(request):
    try:
        if request.method == "GET":
            return Response(SalaryStructureSerializer(SalaryStructure.objects.all(), many=True).data)
        ser = SalaryStructureSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def salary_structure_detail(request, pk):
    try:
        obj = SalaryStructure.objects.get(pk=pk)
    except SalaryStructure.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    try:
        if request.method == "GET":
            return Response(SalaryStructureSerializer(obj).data)
        if request.method == "PATCH":
            ser = SalaryStructureSerializer(obj, data=request.data, partial=True)
            if not ser.is_valid():
                return Response(ser.errors, status=400)
            ser.save()
            return Response(ser.data)
        obj.delete()
        return Response({"message": "Deleted."}, status=204)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Deduction Types ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def deduction_type_list(request):
    try:
        if request.method == "GET":
            return Response(DeductionTypeSerializer(DeductionType.objects.all(), many=True).data)
        ser = DeductionTypeSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def deduction_type_detail(request, pk):
    try:
        obj = DeductionType.objects.get(pk=pk)
        if request.method == "PATCH":
            ser = DeductionTypeSerializer(obj, data=request.data, partial=True)
            if not ser.is_valid():
                return Response(ser.errors, status=400)
            ser.save()
            return Response(ser.data)
        obj.delete()
        return Response({"message": "Deleted."}, status=204)
    except DeductionType.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Payroll Runs ─────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def payroll_run_list(request):
    try:
        if request.method == "GET":
            qs = PayrollRun.objects.select_related("academic_year", "processed_by").prefetch_related("entries")
            return Response(PayrollRunListSerializer(qs, many=True).data)
        ser = PayrollRunSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        run = ser.save()
        return Response(PayrollRunListSerializer(run).data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def payroll_run_detail(request, pk):
    try:
        run = PayrollRun.objects.select_related("academic_year", "processed_by").prefetch_related("entries__staff__user", "entries__salary_structure").get(pk=pk)
    except PayrollRun.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    try:
        if request.method == "GET":
            return Response(PayrollRunSerializer(run).data)
        ser = PayrollRunSerializer(run, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def process_payroll_run(request, pk):
    """
    Auto-generate PayrollEntry records for all active staff using their matching SalaryStructure.
    """
    try:
        run = PayrollRun.objects.get(pk=pk)
        if run.status != "draft":
            return Response({"error": "Only draft payroll runs can be processed."}, status=400)

        deductions = DeductionType.objects.filter(is_active=True, is_mandatory=True)
        staff_list = Staff.objects.filter(status="active").select_related("user")

        entries_created = 0
        for staff in staff_list:
            structure = SalaryStructure.objects.filter(
                designation__iexact=staff.designation, is_active=True
            ).first()

            if not structure:
                continue

            hra = structure.basic_salary * structure.hra_percent / 100
            da = structure.basic_salary * structure.da_percent / 100
            gross = structure.basic_salary + hra + da + structure.ta_amount + structure.medical_allowance + structure.other_allowances

            pf = Decimal("0")
            esi = Decimal("0")
            tds = Decimal("0")
            other = Decimal("0")

            for d in deductions:
                val = d.value if d.calculation_type == "fixed" else structure.basic_salary * d.value / 100
                if "pf" in d.name.lower():
                    pf += val
                elif "esi" in d.name.lower():
                    esi += val
                elif "tds" in d.name.lower():
                    tds += val
                else:
                    other += val

            total_deductions = pf + esi + tds + other
            net = gross - total_deductions

            PayrollEntry.objects.update_or_create(
                payroll_run=run,
                staff=staff,
                defaults={
                    "salary_structure": structure,
                    "basic_salary": structure.basic_salary,
                    "hra": hra,
                    "da": da,
                    "ta": structure.ta_amount,
                    "other_allowances": structure.other_allowances,
                    "gross_salary": gross,
                    "pf_deduction": pf,
                    "esi_deduction": esi,
                    "tds_deduction": tds,
                    "other_deductions": other,
                    "total_deductions": total_deductions,
                    "net_salary": net,
                }
            )
            entries_created += 1

        run.status = "processed"
        run.processed_by = request.user
        run.processed_at = tz.now()
        run.save()

        return Response({"message": f"Payroll processed for {entries_created} staff."})
    except PayrollRun.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Payroll Entry (individual payslip) ───────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def payroll_entry_detail(request, pk):
    try:
        entry = PayrollEntry.objects.select_related("staff", "staff__user", "salary_structure", "payroll_run").get(pk=pk)
        if request.method == "GET":
            return Response(PayrollEntrySerializer(entry).data)
        ser = PayrollEntrySerializer(entry, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data)
    except PayrollEntry.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
