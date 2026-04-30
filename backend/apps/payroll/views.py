import datetime
from decimal import Decimal

import django.utils.timezone as tz
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.models import Staff
from .models import SalaryStructure, DeductionType, PayrollRun, PayrollEntry, IncrementHistory
from .serializers import (
    SalaryStructureSerializer, DeductionTypeSerializer,
    PayrollRunSerializer, PayrollRunListSerializer, PayrollEntrySerializer,
    IncrementHistorySerializer,
)

MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


# ─── Salary Structures ────────────────────────────────────────────────────────

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
        run = PayrollRun.objects.select_related("academic_year", "processed_by").prefetch_related(
            "entries__staff__user", "entries__salary_structure"
        ).get(pk=pk)
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
    Auto-generate PayrollEntry records for all active staff.
    Applies attendance prorating, increment history, and auto-generates AI insights.
    """
    try:
        run = PayrollRun.objects.get(pk=pk)
        if run.status != "draft":
            return Response({"error": "Only draft payroll runs can be processed."}, status=400)

        working_days = int(request.data.get("working_days", 26))
        deductions = DeductionType.objects.filter(is_active=True, is_mandatory=True)
        staff_list = Staff.objects.filter(status="active").select_related("user")

        entries_created = 0
        for staff in staff_list:
            structure = SalaryStructure.objects.filter(
                designation__iexact=staff.designation, is_active=True
            ).first()
            if not structure:
                continue

            # Use increment-adjusted basic if available
            effective_date = datetime.date(run.year, run.month, 1)
            increment_rec = IncrementHistory.objects.filter(
                staff=staff, effective_from__lte=effective_date
            ).order_by("-effective_from").first()

            basic = Decimal(str(increment_rec.new_basic)) if increment_rec and increment_rec.new_basic else structure.basic_salary
            increment_amount = Decimal(str(increment_rec.increment_amount)) if increment_rec else Decimal("0")

            hra = basic * structure.hra_percent / 100
            da = basic * structure.da_percent / 100

            # Attendance lookup
            paid_days = _get_paid_days(staff, run.month, run.year, working_days)
            attendance_pct = Decimal(str(round(paid_days / working_days * 100, 2))) if working_days else Decimal("100")

            # Prorate base allowances for absences
            if paid_days < working_days:
                ratio = Decimal(str(paid_days)) / Decimal(str(working_days))
                actual_basic = basic * ratio
                actual_hra = hra * ratio
                actual_da = da * ratio
                actual_ta = structure.ta_amount * ratio
                actual_medical = structure.medical_allowance * ratio
                actual_other = structure.other_allowances * ratio
            else:
                actual_basic = basic
                actual_hra = hra
                actual_da = da
                actual_ta = structure.ta_amount
                actual_medical = structure.medical_allowance
                actual_other = structure.other_allowances

            # Incentive is not prorated (paid for results, not days)
            incentive_amount = Decimal("0")
            gross = actual_basic + actual_hra + actual_da + actual_ta + actual_medical + actual_other + incentive_amount + increment_amount

            # Deductions computed on full basic (not prorated) per Indian payroll norms
            pf = esi = tds = other_ded = Decimal("0")
            for d in deductions:
                val = d.value if d.calculation_type == "fixed" else basic * d.value / 100
                name_lower = d.name.lower()
                if "pf" in name_lower or "provident" in name_lower:
                    pf += val
                elif "esi" in name_lower or "insurance" in name_lower:
                    esi += val
                elif "tds" in name_lower or "tax" in name_lower:
                    tds += val
                else:
                    other_ded += val

            total_deductions = pf + esi + tds + other_ded
            net = gross - total_deductions

            PayrollEntry.objects.update_or_create(
                payroll_run=run,
                staff=staff,
                defaults={
                    "salary_structure": structure,
                    "basic_salary": actual_basic,
                    "hra": actual_hra,
                    "da": actual_da,
                    "ta": actual_ta,
                    "other_allowances": actual_other,
                    "incentive_amount": incentive_amount,
                    "increment_amount": increment_amount,
                    "gross_salary": gross,
                    "pf_deduction": pf,
                    "esi_deduction": esi,
                    "tds_deduction": tds,
                    "other_deductions": other_ded,
                    "total_deductions": total_deductions,
                    "net_salary": net,
                    "working_days": working_days,
                    "paid_days": paid_days,
                    "attendance_pct": attendance_pct,
                },
            )
            entries_created += 1

        run.status = "processed"
        run.processed_by = request.user
        run.processed_at = tz.now()
        run.save()

        # Auto-generate AI insights
        try:
            from .ai_service import PayrollAIInsightEngine
            run.refresh_from_db()
            PayrollAIInsightEngine().analyze_payroll_run(run)
        except Exception:
            pass

        return Response({"message": f"Payroll processed for {entries_created} staff."})
    except PayrollRun.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_ai_insights(request, pk):
    """Regenerate AI insights for all entries in a payroll run."""
    try:
        run = PayrollRun.objects.prefetch_related(
            "entries__staff__user", "entries__staff__increment_history"
        ).get(pk=pk)
        from .ai_service import PayrollAIInsightEngine
        result = PayrollAIInsightEngine().analyze_payroll_run(run)
        return Response({"message": f"AI insights generated for {result['analyzed']} entries.", "result": result})
    except PayrollRun.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Payroll Entry ────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def payroll_entry_detail(request, pk):
    try:
        entry = PayrollEntry.objects.select_related(
            "staff", "staff__user", "salary_structure", "payroll_run"
        ).get(pk=pk)
        if request.method == "GET":
            return Response(PayrollEntrySerializer(entry).data)
        ser = PayrollEntrySerializer(entry, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        updated = ser.save()
        # Recompute net if incentive/increment changed
        if "incentive_amount" in request.data or "increment_amount" in request.data:
            gross = (
                updated.basic_salary + updated.hra + updated.da + updated.ta
                + updated.other_allowances + updated.incentive_amount + updated.increment_amount
            )
            updated.gross_salary = gross
            updated.net_salary = gross - updated.total_deductions
            updated.save(update_fields=["gross_salary", "net_salary"])
            # Refresh AI insights for this single entry
            try:
                from .ai_service import PayrollAIInsightEngine
                insights = PayrollAIInsightEngine().generate_entry_insights(updated, updated.payroll_run)
                updated.ai_deduction_reason = insights['deduction_reason']
                updated.ai_increment_reason = insights['increment_reason']
                updated.ai_incentive_reason = insights['incentive_reason']
                updated.ai_overall_summary = insights['overall_summary']
                updated.save(update_fields=[
                    'ai_deduction_reason', 'ai_increment_reason',
                    'ai_incentive_reason', 'ai_overall_summary',
                ])
            except Exception:
                pass
        return Response(PayrollEntrySerializer(updated).data)
    except PayrollEntry.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Increment History ────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def increment_list(request):
    try:
        if request.method == "GET":
            qs = IncrementHistory.objects.select_related(
                "staff", "staff__user", "approved_by", "salary_structure"
            )
            staff_id = request.query_params.get("staff_id")
            if staff_id:
                qs = qs.filter(staff_id=staff_id)
            return Response(IncrementHistorySerializer(qs, many=True).data)

        data = request.data.copy()
        # Auto-compute increment_amount from basic diff
        try:
            old_b = Decimal(str(data.get("old_basic", 0)))
            new_b = Decimal(str(data.get("new_basic", 0)))
            data["increment_amount"] = str(new_b - old_b)
        except Exception:
            pass

        # Generate AI reason if not provided
        if not data.get("ai_reason"):
            try:
                from .ai_service import PayrollAIInsightEngine
                staff = Staff.objects.select_related("user").get(pk=data["staff"])
                ai_reason = PayrollAIInsightEngine().generate_increment_ai_reason(
                    staff=staff,
                    increment_type=data.get("increment_type", "annual"),
                    old_basic=data.get("old_basic", 0),
                    new_basic=data.get("new_basic", 0),
                    reason=data.get("reason", ""),
                )
                data["ai_reason"] = ai_reason
            except Exception:
                pass

        data["approved_by"] = request.user.pk
        ser = IncrementHistorySerializer(data=data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def increment_detail(request, pk):
    try:
        obj = IncrementHistory.objects.select_related("staff", "staff__user", "approved_by").get(pk=pk)
    except IncrementHistory.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    try:
        if request.method == "GET":
            return Response(IncrementHistorySerializer(obj).data)
        if request.method == "PATCH":
            ser = IncrementHistorySerializer(obj, data=request.data, partial=True)
            if not ser.is_valid():
                return Response(ser.errors, status=400)
            ser.save()
            return Response(ser.data)
        obj.delete()
        return Response({"message": "Deleted."}, status=204)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_increment_ai_reason(request):
    """Generate an AI reason for a proposed increment without saving it."""
    try:
        from .ai_service import PayrollAIInsightEngine
        staff = Staff.objects.select_related("user").get(pk=request.data["staff_id"])
        reason = PayrollAIInsightEngine().generate_increment_ai_reason(
            staff=staff,
            increment_type=request.data.get("increment_type", "annual"),
            old_basic=request.data.get("old_basic", 0),
            new_basic=request.data.get("new_basic", 0),
            reason=request.data.get("reason", ""),
        )
        return Response({"ai_reason": reason})
    except Staff.DoesNotExist:
        return Response({"error": "Staff not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Analytics ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_analytics(request):
    try:
        # Last 6 payroll runs (any status)
        runs = list(
            PayrollRun.objects.prefetch_related("entries").order_by("-year", "-month")[:6]
        )

        monthly_data = []
        for run in reversed(runs):
            entries = list(run.entries.all())
            monthly_data.append({
                "label": f"{MONTHS_SHORT[run.month]} '{str(run.year)[2:]}",
                "month": run.month,
                "year": run.year,
                "gross": float(sum(e.gross_salary for e in entries)),
                "net": float(sum(e.net_salary for e in entries)),
                "deductions": float(sum(e.total_deductions for e in entries)),
                "incentives": float(sum(e.incentive_amount for e in entries)),
                "staff_count": len(entries),
                "status": run.status,
            })

        # Deduction breakdown from most recent processed run
        deduction_totals = {"pf": 0, "esi": 0, "tds": 0, "other": 0}
        processed_runs = [r for r in runs if r.status in ("processed", "paid")]
        if processed_runs:
            for e in processed_runs[0].entries.all():
                deduction_totals["pf"] += float(e.pf_deduction)
                deduction_totals["esi"] += float(e.esi_deduction)
                deduction_totals["tds"] += float(e.tds_deduction)
                deduction_totals["other"] += float(e.other_deductions)

        # Designation breakdown
        designation_stats = []
        for s in SalaryStructure.objects.filter(is_active=True).order_by("basic_salary"):
            cnt = Staff.objects.filter(designation__iexact=s.designation, status="active").count()
            designation_stats.append({
                "designation": s.designation,
                "basic": float(s.basic_salary),
                "gross": float(s.gross_salary()),
                "staff_count": cnt,
            })

        # Summary
        total_active_staff = Staff.objects.filter(status="active").count()
        latest_run = runs[0] if runs else None

        # Recent increments
        recent_increments = IncrementHistorySerializer(
            IncrementHistory.objects.select_related("staff", "staff__user").order_by("-created_at")[:5],
            many=True,
        ).data

        return Response({
            "monthly_data": monthly_data,
            "deduction_totals": deduction_totals,
            "designation_stats": designation_stats,
            "summary": {
                "total_active_staff": total_active_staff,
                "total_runs": PayrollRun.objects.count(),
                "processed_runs": PayrollRun.objects.filter(status__in=["processed", "paid"]).count(),
                "latest_run": PayrollRunListSerializer(latest_run).data if latest_run else None,
            },
            "recent_increments": recent_increments,
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_paid_days(staff, month, year, working_days):
    """Return paid days for a staff member in the given month."""
    try:
        from apps.staff.models import StaffAttendance
        count = StaffAttendance.objects.filter(
            staff=staff,
            date__year=year,
            date__month=month,
            status__in=["present", "on_leave", "half_day"],
        ).count()
        return count if count > 0 else working_days
    except Exception:
        return working_days
