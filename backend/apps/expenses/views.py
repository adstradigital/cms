from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ExpenseCategory, ExpenseEntry, ExpenseApproval
from .serializers import ExpenseCategorySerializer, ExpenseEntrySerializer, ExpenseApprovalSerializer


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
            category_id = request.query_params.get("category")
            status_filter = request.query_params.get("status")
            academic_year = request.query_params.get("academic_year")
            qs = ExpenseEntry.objects.select_related("category", "submitted_by", "academic_year").prefetch_related("approval").all()
            if category_id:
                qs = qs.filter(category_id=category_id)
            if status_filter:
                qs = qs.filter(status=status_filter)
            if academic_year:
                qs = qs.filter(academic_year_id=academic_year)
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
    """Approve or reject an expense entry."""
    try:
        entry = ExpenseEntry.objects.get(pk=pk)
        action = request.data.get("action")
        if action not in ("approved", "rejected"):
            return Response({"error": "action must be approved or rejected."}, status=400)
        remarks = request.data.get("remarks", "")
        ExpenseApproval.objects.update_or_create(
            expense=entry,
            defaults={"reviewed_by": request.user, "action": action, "remarks": remarks}
        )
        entry.status = action
        entry.save()
        return Response({"message": f"Expense {action}."})
    except ExpenseEntry.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
