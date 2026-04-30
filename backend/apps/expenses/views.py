import calendar as cal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from .models import ExpenseCategory, ExpenseEntry, ExpenseApproval
from .serializers import ExpenseCategorySerializer, ExpenseEntrySerializer, ExpenseApprovalSerializer
from apps.fees.models import FeePayment
from apps.payroll.models import PayrollEntry


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def category_list(request):
    try:
        if request.method == "GET":
            return Response(ExpenseCategorySerializer(ExpenseCategory.objects.all(), many=True).data)
        ser = ExpenseCategorySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save()
        return Response(ser.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def category_detail(request, pk):
    try:
        obj = ExpenseCategory.objects.get(pk=pk)
    except ExpenseCategory.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    try:
        if request.method == "GET":
            return Response(ExpenseCategorySerializer(obj).data)
        if request.method == "PATCH":
            ser = ExpenseCategorySerializer(obj, data=request.data, partial=True)
            if not ser.is_valid():
                return Response(ser.errors, status=400)
            ser.save()
            return Response(ser.data)
        obj.delete()
        return Response({"message": "Deleted."}, status=204)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def entry_list(request):
    try:
        if request.method == "GET":
            qs = ExpenseEntry.objects.select_related(
                "category", "submitted_by", "academic_year"
            ).prefetch_related("approval").all()
            p = request.query_params
            if p.get("category"):      qs = qs.filter(category_id=p["category"])
            if p.get("status"):        qs = qs.filter(status=p["status"])
            if p.get("academic_year"): qs = qs.filter(academic_year_id=p["academic_year"])
            if p.get("year"):          qs = qs.filter(expense_date__year=p["year"])
            if p.get("month"):         qs = qs.filter(expense_date__month=p["month"])
            return Response(ExpenseEntrySerializer(qs, many=True).data)
        ser = ExpenseEntrySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        ser.save(submitted_by=request.user, status="pending")
        return Response(ser.data, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def entry_detail(request, pk):
    try:
        obj = ExpenseEntry.objects.select_related("category", "submitted_by").get(pk=pk)
    except ExpenseEntry.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    try:
        if request.method == "GET":
            return Response(ExpenseEntrySerializer(obj).data)
        if request.method == "PATCH":
            ser = ExpenseEntrySerializer(obj, data=request.data, partial=True)
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
def approve_expense(request, pk):
    try:
        entry = ExpenseEntry.objects.get(pk=pk)
        action = request.data.get("action")
        if action not in ("approved", "rejected"):
            return Response({"error": "action must be approved or rejected."}, status=400)
        remarks = request.data.get("remarks", "")
        ExpenseApproval.objects.update_or_create(
            expense=entry,
            defaults={"reviewed_by": request.user, "action": action, "remarks": remarks},
        )
        entry.status = action
        entry.save()
        return Response({"message": f"Expense {action}."})
    except ExpenseEntry.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def balance_sheet(request):
    try:
        p = request.query_params
        academic_year = p.get("academic_year")
        year          = p.get("year")
        month         = p.get("month")

        # Base querysets
        income_qs  = ExpenseEntry.objects.filter(status__in=["approved", "paid"], category__category_type="income")
        expense_qs = ExpenseEntry.objects.filter(status__in=["approved", "paid"], category__category_type="expense")
        fees_qs    = FeePayment.objects.filter(status__in=["paid", "partial"])
        pay_qs     = PayrollEntry.objects.filter(is_paid=True)

        # Apply filters
        if academic_year:
            income_qs  = income_qs.filter(academic_year_id=academic_year)
            expense_qs = expense_qs.filter(academic_year_id=academic_year)
            fees_qs    = fees_qs.filter(fee_structure__academic_year_id=academic_year)
            pay_qs     = pay_qs.filter(payroll_run__academic_year_id=academic_year)
        if year:
            income_qs  = income_qs.filter(expense_date__year=year)
            expense_qs = expense_qs.filter(expense_date__year=year)
            fees_qs    = fees_qs.filter(payment_date__year=year)
            pay_qs     = pay_qs.filter(payroll_run__year=year)
        if month:
            income_qs  = income_qs.filter(expense_date__month=month)
            expense_qs = expense_qs.filter(expense_date__month=month)
            fees_qs    = fees_qs.filter(payment_date__month=month)
            pay_qs     = pay_qs.filter(payroll_run__month=month)

        # Aggregations
        manual_income   = income_qs.aggregate(total=Sum("amount"))["total"]    or 0
        manual_expense  = expense_qs.aggregate(total=Sum("amount"))["total"]   or 0
        fees_income     = fees_qs.aggregate(total=Sum("amount_paid"))["total"] or 0
        payroll_expense = pay_qs.aggregate(total=Sum("net_salary"))["total"]   or 0

        income_bd  = list(income_qs.values("category__name").annotate(total=Sum("amount")))
        expense_bd = list(expense_qs.values("category__name").annotate(total=Sum("amount")))
        fees_bd    = list(fees_qs.values("fee_structure__category__name").annotate(total=Sum("amount_paid")))

        total_income  = float(manual_income) + float(fees_income)
        total_expense = float(manual_expense) + float(payroll_expense)
        balance = total_income - total_expense

        income_lines  = []
        expense_lines = []

        for fi in fees_bd:
            name = fi["fee_structure__category__name"] or "Student Fees"
            income_lines.append({"label": f"Fee Collection — {name}", "amount": float(fi["total"]), "source": "fees"})
        for mi in income_bd:
            income_lines.append({"label": mi["category__name"] or "Other Income", "amount": float(mi["total"]), "source": "manual"})

        if float(payroll_expense) > 0:
            expense_lines.append({"label": "Staff Salaries (Payroll)", "amount": float(payroll_expense), "source": "payroll"})
        for me in expense_bd:
            expense_lines.append({"label": me["category__name"] or "Other Expense", "amount": float(me["total"]), "source": "manual"})

        pending_count = ExpenseEntry.objects.filter(status="pending").count()

        return Response({
            "manual_income":    float(manual_income),
            "fees_income":      float(fees_income),
            "manual_expense":   float(manual_expense),
            "payroll_expense":  float(payroll_expense),
            "total_income":     total_income,
            "total_expense":    total_expense,
            "balance":          balance,
            "income_lines":     income_lines,
            "expense_lines":    expense_lines,
            "pending_count":    pending_count,
            "breakdown": [
                *[{"particulars": l["label"], "income": l["amount"], "expense": 0} for l in income_lines],
                *[{"particulars": l["label"], "income": 0, "expense": l["amount"]} for l in expense_lines],
            ],
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transaction_history(request):
    try:
        p            = request.query_params
        year         = p.get("year")
        month        = p.get("month")
        academic_yr  = p.get("academic_year")
        source       = p.get("source")    # manual | fees | payroll
        tx_type      = p.get("type")      # income | expense
        status_f     = p.get("status")

        transactions = []

        # ── Manual entries ────────────────────────────────────────────────────
        if not source or source == "manual":
            qs = ExpenseEntry.objects.select_related(
                "category", "submitted_by", "academic_year"
            ).all()
            if year:        qs = qs.filter(expense_date__year=year)
            if month:       qs = qs.filter(expense_date__month=month)
            if academic_yr: qs = qs.filter(academic_year_id=academic_yr)
            if status_f:    qs = qs.filter(status=status_f)
            if tx_type == "income":    qs = qs.filter(category__category_type="income")
            elif tx_type == "expense": qs = qs.filter(category__category_type="expense")
            for e in qs:
                transactions.append({
                    "id":           f"manual_{e.id}",
                    "date":         str(e.expense_date),
                    "title":        e.title,
                    "description":  e.description or "",
                    "category":     e.category.name if e.category else "Uncategorized",
                    "type":         e.category.category_type if e.category else "expense",
                    "amount":       float(e.amount),
                    "source":       "manual",
                    "source_label": "Manual Entry",
                    "status":       e.status,
                    "submitted_by": e.submitted_by.get_full_name() if e.submitted_by else "",
                })

        # ── Fee payments (income) ─────────────────────────────────────────────
        if (not source or source == "fees") and (not tx_type or tx_type == "income"):
            qs = FeePayment.objects.filter(status__in=["paid", "partial"]).select_related(
                "student__user", "fee_structure__category", "fee_structure__academic_year"
            )
            if year:        qs = qs.filter(payment_date__year=year)
            if month:       qs = qs.filter(payment_date__month=month)
            if academic_yr: qs = qs.filter(fee_structure__academic_year_id=academic_yr)
            for fp in qs:
                student_name = fp.student.user.get_full_name() if (fp.student and fp.student.user) else "Student"
                cat_name = (fp.fee_structure.category.name if (fp.fee_structure and fp.fee_structure.category) else "Student Fees")
                date_str = str(fp.payment_date) if fp.payment_date else str(fp.created_at.date())
                desc = cat_name + (f" | Receipt #{fp.receipt_number}" if fp.receipt_number else "")
                transactions.append({
                    "id":           f"fee_{fp.id}",
                    "date":         date_str,
                    "title":        f"Fee Collection — {student_name}",
                    "description":  desc,
                    "category":     cat_name,
                    "type":         "income",
                    "amount":       float(fp.amount_paid),
                    "source":       "fees",
                    "source_label": "Fee Collection",
                    "status":       "approved",
                    "submitted_by": "",
                })

        # ── Payroll entries (expense) ─────────────────────────────────────────
        if (not source or source == "payroll") and (not tx_type or tx_type == "expense"):
            qs = PayrollEntry.objects.filter(is_paid=True).select_related("staff__user", "payroll_run")
            if year:        qs = qs.filter(payroll_run__year=year)
            if month:       qs = qs.filter(payroll_run__month=month)
            if academic_yr: qs = qs.filter(payroll_run__academic_year_id=academic_yr)
            for pe in qs:
                staff_name = pe.staff.user.get_full_name() if (pe.staff and pe.staff.user) else "Staff"
                pr = pe.payroll_run
                date_str = str(pe.payment_date) if pe.payment_date else f"{pr.year}-{pr.month:02d}-01"
                desc = f"{cal.month_name[pr.month]} {pr.year}" if pr else ""
                transactions.append({
                    "id":           f"payroll_{pe.id}",
                    "date":         date_str,
                    "title":        f"Payroll — {staff_name}",
                    "description":  desc,
                    "category":     "Staff Salaries",
                    "type":         "expense",
                    "amount":       float(pe.net_salary),
                    "source":       "payroll",
                    "source_label": "Payroll",
                    "status":       "approved",
                    "submitted_by": "",
                })

        transactions.sort(key=lambda x: x.get("date") or "", reverse=True)
        return Response({"results": transactions, "count": len(transactions)})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
