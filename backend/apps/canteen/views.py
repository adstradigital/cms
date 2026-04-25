from datetime import timedelta

from django.db.models import Sum, Avg, Count, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier, CanteenVendor,
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog,
    CanteenConsumptionLog, FoodCategory, CanteenOrder, OrderItem, CanteenPayment,
    CanteenIngredient, CanteenDish, CanteenCombo, WeeklyMenu,
    CanteenPurchaseOrder, CanteenPurchaseOrderItem,
    CanteenStaffProfile, CanteenStaffAttendance, CanteenStaffTask,
    CanteenShift, CanteenStaffShiftAssignment,
    CanteenStaffDocument, CanteenStaffLeaveRequest, CanteenStaffPerformanceLog,
    CanteenStaffAnnouncement, CanteenPayrollRecord,
    CanteenInventoryCategory,
)
from .serializers import (
    FoodItemSerializer, DailyMenuSerializer, CanteenComplaintSerializer,
    CanteenSupplierSerializer, CanteenVendorSerializer, CanteenInventoryItemSerializer,
    CanteenInventoryLogSerializer, CanteenWastageLogSerializer,
    CanteenConsumptionLogSerializer, FoodCategorySerializer, CanteenOrderSerializer,
    CanteenIngredientSerializer, CanteenDishSerializer, CanteenComboSerializer,
    OrderItemSerializer, CanteenPaymentSerializer, WeeklyMenuSerializer,
    CanteenPurchaseOrderSerializer, CanteenPurchaseOrderItemSerializer,
    CanteenStaffProfileSerializer, CanteenStaffAttendanceSerializer, CanteenStaffTaskSerializer,
    CanteenShiftSerializer, CanteenStaffShiftAssignmentSerializer,
    CanteenStaffDocumentSerializer, CanteenStaffLeaveRequestSerializer,
    CanteenStaffPerformanceLogSerializer, CanteenStaffAnnouncementSerializer,
    CanteenPayrollRecordSerializer,
    CanteenInventoryCategorySerializer,
)


class FoodCategoryViewSet(viewsets.ModelViewSet):
    queryset = FoodCategory.objects.annotate(
        food_items_count=Count('food_items')
    ).prefetch_related('food_items').order_by('name')
    serializer_class = FoodCategorySerializer
    permission_classes = [IsAuthenticated]


class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        is_available = self.request.query_params.get('is_available')
        if category:
            qs = qs.filter(category=category)
        if is_available is not None:
            qs = qs.filter(is_available=is_available.lower() == 'true')
        return qs

    @action(detail=False, methods=['get'])
    def price_chart(self, request):
        qs = self.get_queryset().filter(is_available=True)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def top_selling(self, request):
        qs = self.get_queryset().order_by('-times_ordered')[:10]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['patch'])
    def toggle_availability(self, request, pk=None):
        item = self.get_object()
        item.status = "inactive" if item.status == "active" else "active"
        item.save()
        return Response({'status': item.status, 'is_available': item.is_available})


class DailyMenuViewSet(viewsets.ModelViewSet):
    queryset = DailyMenu.objects.prefetch_related('food_items', 'dishes', 'ingredients').all()
    serializer_class = DailyMenuSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        meal_type = self.request.query_params.get('meal_type')
        if date:
            qs = qs.filter(date=date)
        if meal_type:
            qs = qs.filter(meal_type=meal_type)
        return qs




class WeeklyMenuViewSet(viewsets.ModelViewSet):
    queryset = WeeklyMenu.objects.prefetch_related('food_items').all()
    serializer_class = WeeklyMenuSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        day = self.request.query_params.get('day')
        meal_type = self.request.query_params.get('meal_type')
        if day:
            qs = qs.filter(day=day)
        if meal_type:
            qs = qs.filter(meal_type=meal_type)
        return qs


class CanteenIngredientViewSet(viewsets.ModelViewSet):
    queryset = CanteenIngredient.objects.all()
    serializer_class = CanteenIngredientSerializer
    permission_classes = [IsAuthenticated]


class CanteenDishViewSet(viewsets.ModelViewSet):
    queryset = CanteenDish.objects.prefetch_related('ingredients').all()
    serializer_class = CanteenDishSerializer
    permission_classes = [IsAuthenticated]


class CanteenComboViewSet(viewsets.ModelViewSet):
    queryset = CanteenCombo.objects.prefetch_related('dishes').all()
    serializer_class = CanteenComboSerializer
    permission_classes = [IsAuthenticated]


class CanteenComplaintViewSet(viewsets.ModelViewSet):
    queryset = CanteenComplaint.objects.select_related('user').all()
    serializer_class = CanteenComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        complaint_status = self.request.query_params.get('status')
        if complaint_status:
            qs = qs.filter(status=complaint_status)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        complaint = self.get_object()
        new_status = request.data.get('status')
        resolution_note = request.data.get('resolution_note', '')
        valid_statuses = [s[0] for s in CanteenComplaint.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        complaint.status = new_status
        if resolution_note:
            complaint.resolution_note = resolution_note
        complaint.save()
        return Response(CanteenComplaintSerializer(complaint).data)


class CanteenSupplierViewSet(viewsets.ModelViewSet):
    queryset = CanteenSupplier.objects.all()
    serializer_class = CanteenSupplierSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        supplier = self.get_object()
        # Mock logic or real logic if orders exist
        return Response({
            'quality_score': float(supplier.quality_score),
            'delivery_score': float(supplier.delivery_score),
            'performance_rating': float(supplier.performance_rating),
            'total_orders': supplier.purchase_orders.count(),
            'received_orders': supplier.purchase_orders.filter(status='received').count()
        })


class CanteenPurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = CanteenPurchaseOrder.objects.prefetch_related('items').all()
    serializer_class = CanteenPurchaseOrderSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def receive_order(self, request, pk=None):
        order = self.get_object()
        if order.status == 'received':
            return Response({'error': 'Order already received'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Iterate through items and update inventory
        for item in order.items.all():
            inv_item = item.inventory_item
            if inv_item:
                inv_item.current_stock += item.quantity
                inv_item.save()
                
                # Log the inbound movement
                CanteenInventoryLog.objects.create(
                    item=inv_item,
                    log_type='in',
                    quantity=item.quantity,
                    supplier=order.supplier,
                    reason=f"Received via Purchase Order PO-{order.id}",
                    recorded_by=request.user
                )

        order.status = 'received'
        order.save()
        return Response({'status': 'Order marked as received and inventory updated'})


class CanteenVendorViewSet(viewsets.ModelViewSet):
    queryset = CanteenVendor.objects.all()
    serializer_class = CanteenVendorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class CanteenInventoryItemViewSet(viewsets.ModelViewSet):
    queryset = CanteenInventoryItem.objects.all()
    serializer_class = CanteenInventoryItemSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        qs = self.get_queryset().filter(current_stock__lte=F('min_stock_level'))
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def near_expiry(self, request):
        soon = timezone.now().date() + timedelta(days=7)
        qs = self.get_queryset().filter(expiry_date__lte=soon, expiry_date__gte=timezone.now().date())
        return Response(self.get_serializer(qs, many=True).data)


class CanteenStaffProfileViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffProfile.objects.select_related('user').all()
    serializer_class = CanteenStaffProfileSerializer
    permission_classes = [IsAuthenticated]


class CanteenStaffAttendanceViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffAttendance.objects.select_related('staff__user').all()
    serializer_class = CanteenStaffAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
        return qs

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        staff_id = request.query_params.get("staff")

        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        by_status = {
            "present": qs.filter(status="present").count(),
            "late": qs.filter(status="late").count(),
            "absent": qs.filter(status="absent").count(),
            "half_day": qs.filter(status="half_day").count(),
        }

        # Per-staff rollup (lightweight, for reports dashboards)
        rollup = {}
        for rec in qs.select_related("staff__user"):
            sid = rec.staff_id
            if sid not in rollup:
                rollup[sid] = {
                    "staff": sid,
                    "staff_name": rec.staff.user.get_full_name(),
                    "role": rec.staff.role,
                    "present": 0,
                    "late": 0,
                    "absent": 0,
                    "half_day": 0,
                    "total": 0,
                }
            rollup[sid][rec.status] = rollup[sid].get(rec.status, 0) + 1
            rollup[sid]["total"] += 1

        return Response({
            "total_records": qs.count(),
            "by_status": by_status,
            "by_staff": list(rollup.values()),
        })


class CanteenStaffTaskViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffTask.objects.select_related('staff__user', 'assigned_by').all()
    serializer_class = CanteenStaffTaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class CanteenStaffDocumentViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffDocument.objects.select_related("staff__user").all()
    serializer_class = CanteenStaffDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs


class CanteenShiftViewSet(viewsets.ModelViewSet):
    queryset = CanteenShift.objects.all()
    serializer_class = CanteenShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs


class CanteenStaffShiftAssignmentViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffShiftAssignment.objects.select_related("staff__user", "shift", "created_by").all()
    serializer_class = CanteenStaffShiftAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        staff_id = self.request.query_params.get("staff")
        shift_id = self.request.query_params.get("shift")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if shift_id:
            qs = qs.filter(shift_id=shift_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CanteenStaffLeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffLeaveRequest.objects.select_related("staff__user", "reviewed_by").all()
    serializer_class = CanteenStaffLeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_q = self.request.query_params.get("status")
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if status_q:
            qs = qs.filter(status=status_q)
        return qs

    def perform_update(self, serializer):
        prev = self.get_object()
        updated = serializer.save()
        if prev.status != updated.status and updated.status in {"approved", "rejected"}:
            updated.reviewed_by = self.request.user
            updated.reviewed_at = timezone.now()
            updated.save(update_fields=["reviewed_by", "reviewed_at"])


class CanteenStaffPerformanceLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffPerformanceLog.objects.select_related("staff__user", "created_by").all()
    serializer_class = CanteenStaffPerformanceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CanteenStaffAnnouncementViewSet(viewsets.ModelViewSet):
    queryset = CanteenStaffAnnouncement.objects.select_related("created_by", "target_staff__user").all()
    serializer_class = CanteenStaffAnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        target_staff = self.request.query_params.get("target_staff")
        if category:
            qs = qs.filter(category=category)
        if target_staff:
            qs = qs.filter(target_staff_id=target_staff)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CanteenPayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = CanteenPayrollRecord.objects.select_related("staff__user", "generated_by").all()
    serializer_class = CanteenPayrollRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get("month")  # YYYY-MM-01 recommended
        staff_id = self.request.query_params.get("staff")
        if staff_id:
            qs = qs.filter(staff_id=staff_id)
        if month:
            qs = qs.filter(month=month)
        return qs

    def _compute_net(self, base_amount, overtime_amount, deductions):
        try:
            return (base_amount or 0) + (overtime_amount or 0) - (deductions or 0)
        except Exception:
            return 0

    def perform_create(self, serializer):
        data = serializer.validated_data
        staff = data.get("staff")
        month = data.get("month")
        base_amount = data.get("base_amount")

        if (base_amount is None or float(base_amount) == 0) and staff is not None:
            base_amount = staff.salary

        days_present = data.get("days_present")
        if (days_present is None or int(days_present) == 0) and staff is not None and month is not None:
            start = month.replace(day=1)
            end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            days_present = CanteenStaffAttendance.objects.filter(
                staff=staff,
                date__gte=start,
                date__lte=end,
                status__in=["present", "late", "half_day"],
            ).count()

        overtime_amount = data.get("overtime_amount")
        deductions = data.get("deductions")
        net_pay = self._compute_net(base_amount, overtime_amount, deductions)

        serializer.save(
            generated_by=self.request.user,
            base_amount=base_amount,
            days_present=days_present or 0,
            net_pay=net_pay,
        )

    def perform_update(self, serializer):
        updated = serializer.save()
        updated.net_pay = self._compute_net(updated.base_amount, updated.overtime_amount, updated.deductions)
        updated.save(update_fields=["net_pay"])


class CanteenInventoryLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenInventoryLog.objects.select_related('item', 'supplier', 'recorded_by').all().order_by('-date')
    serializer_class = CanteenInventoryLogSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        log = serializer.save(recorded_by=self.request.user)
        item = log.item
        if log.log_type == 'in':
            item.current_stock += log.quantity
        elif log.log_type in ('out', 'wastage'):
            item.current_stock = max(0, item.current_stock - log.quantity)
        item.save()


class CanteenWastageLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenWastageLog.objects.all().order_by('-date')
    serializer_class = CanteenWastageLogSerializer
    permission_classes = [IsAuthenticated]


class CanteenConsumptionLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenConsumptionLog.objects.all().order_by('-date')
    serializer_class = CanteenConsumptionLogSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        total_servings = self.queryset.aggregate(Sum('total_servings'))['total_servings__sum'] or 0
        total_cost = self.queryset.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
        avg_rating = self.queryset.aggregate(Avg('average_rating'))['average_rating__avg'] or 0
        return Response({
            "total_servings": total_servings,
            "total_cost": float(total_cost),
            "average_rating": float(avg_rating),
        })


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'food_item').all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]


class CanteenPaymentViewSet(viewsets.ModelViewSet):
    queryset = CanteenPayment.objects.select_related('order').all()
    serializer_class = CanteenPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        method = self.request.query_params.get('payment_method')
        pay_status = self.request.query_params.get('status')
        if date:
            qs = qs.filter(payment_date__date=date)
        if method:
            qs = qs.filter(payment_method=method)
        if pay_status:
            is_refunded = pay_status == 'refunded'
            qs = qs.filter(is_refunded=is_refunded)
        return qs

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        date = request.query_params.get('date', timezone.now().date().isoformat())
        payments = self.queryset.filter(payment_date__date=date)
        total = payments.aggregate(total=Sum('amount'))['total'] or 0
        by_method = list(payments.values('payment_method').annotate(total=Sum('amount'), count=Count('id')))
        return Response({
            'date': date,
            'total_earnings': float(total),
            'by_method': by_method,
            'transaction_count': payments.count(),
        })


class CanteenOrderViewSet(viewsets.ModelViewSet):
    queryset = CanteenOrder.objects.select_related('student', 'ordered_by').prefetch_related(
        'order_items__food_item', 'items'
    ).all()
    serializer_class = CanteenOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        order_status = self.request.query_params.get('status')
        date = self.request.query_params.get('date')
        payment_method = self.request.query_params.get('payment_method')
        if order_status:
            qs = qs.filter(status=order_status)
        if date:
            qs = qs.filter(order_date__date=date)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        return qs

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in CanteenOrder.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save()
        return Response(CanteenOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == 'completed':
            return Response({'error': 'Cannot cancel a completed order.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'cancelled'
        order.save()
        return Response({'message': 'Order cancelled successfully.'})


# ─── Function-Based Dashboard & Reports Views ──────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def canteen_dashboard_view(request):
    """Aggregated stats for the canteen admin dashboard."""
    today = timezone.now().date()

    orders_today = CanteenOrder.objects.filter(order_date__date=today)
    total_orders_today = orders_today.count()
    pending_count = orders_today.filter(status='pending').count()
    preparing_count = orders_today.filter(status='preparing').count()
    ready_count = orders_today.filter(status='ready').count()
    completed_count = orders_today.filter(status='completed').count()
    cancelled_count = orders_today.filter(status='cancelled').count()

    revenue_today = orders_today.filter(
        status__in=['completed', 'ready', 'preparing']
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    low_stock_count = CanteenInventoryItem.objects.filter(
        current_stock__lte=F('min_stock_level')
    ).count()

    low_stock_items = list(
        CanteenInventoryItem.objects.filter(current_stock__lte=F('min_stock_level'))
        .values('id', 'name', 'current_stock', 'min_stock_level', 'unit')[:5]
    )

    top_items = FoodItem.objects.order_by('-times_ordered')[:6]

    recent_orders = CanteenOrder.objects.select_related('student', 'ordered_by').order_by('-order_date')[:8]

    # Weekly revenue – last 7 days
    weekly_data = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        rev = CanteenOrder.objects.filter(
            order_date__date=d,
            status='completed',
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        weekly_data.append({'date': d.isoformat(), 'revenue': float(rev)})

    return Response({
        'today': {
            'total_orders': total_orders_today,
            'pending': pending_count,
            'preparing': preparing_count,
            'ready': ready_count,
            'completed': completed_count,
            'cancelled': cancelled_count,
            'revenue': float(revenue_today),
        },
        'low_stock_count': low_stock_count,
        'low_stock_items': [
            {**item, 'current_stock': float(item['current_stock']), 'min_stock_level': float(item['min_stock_level'])}
            for item in low_stock_items
        ],
        'top_items': FoodItemSerializer(top_items, many=True).data,
        'recent_orders': CanteenOrderSerializer(recent_orders, many=True).data,
        'weekly_revenue': weekly_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def canteen_reports_view(request):
    """Sales report for a given period (daily / weekly / monthly)."""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()

    days_map = {'daily': 1, 'weekly': 7, 'monthly': 30}
    days = days_map.get(period, 7)
    start_date = today - timedelta(days=days - 1)

    completed_orders = CanteenOrder.objects.filter(
        order_date__date__gte=start_date,
        order_date__date__lte=today,
        status='completed',
    )
    total_revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or 0
    total_orders = CanteenOrder.objects.filter(
        order_date__date__gte=start_date,
        order_date__date__lte=today,
    ).count()

    daily_sales = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        rev = CanteenOrder.objects.filter(
            order_date__date=d, status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        count = CanteenOrder.objects.filter(order_date__date=d).count()
        daily_sales.append({'date': d.isoformat(), 'revenue': float(rev), 'orders': count})

    popular_items = FoodItem.objects.order_by('-times_ordered')[:10]

    # Payment method breakdown
    payment_breakdown = list(
        CanteenPayment.objects.filter(
            payment_date__date__gte=start_date,
            is_refunded=False,
        ).values('payment_method').annotate(total=Sum('amount'), count=Count('id'))
    )

    # Total wastage cost for the period
    wastage_loss = CanteenWastageLog.objects.filter(
        date__gte=start_date, date__lte=today
    ).aggregate(total=Sum('cost_loss'))['total'] or 0

    return Response({
        'period': period,
        'total_revenue': float(total_revenue),
        'total_orders': total_orders,
        'avg_order_value': float(total_revenue / total_orders) if total_orders else 0,
        'daily_sales': daily_sales,
        'popular_items': FoodItemSerializer(popular_items, many=True).data,
        'payment_breakdown': payment_breakdown,
        'wastage_loss': float(wastage_loss),
    })
class CanteenInventoryCategoryViewSet(viewsets.ModelViewSet):
    queryset = CanteenInventoryCategory.objects.all()
    serializer_class = CanteenInventoryCategorySerializer
    permission_classes = [IsAuthenticated]
