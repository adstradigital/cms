from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg
from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier, 
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog, 
    CanteenConsumptionLog, FoodCategory, CanteenOrder,
    CanteenIngredient, CanteenDish, CanteenCombo, WeeklyMenu
)
from .serializers import (
    FoodItemSerializer, DailyMenuSerializer, CanteenComplaintSerializer, 
    CanteenSupplierSerializer, CanteenInventoryItemSerializer, 
    CanteenInventoryLogSerializer, CanteenWastageLogSerializer, 
    CanteenConsumptionLogSerializer, FoodCategorySerializer, CanteenOrderSerializer,
    CanteenIngredientSerializer, CanteenDishSerializer, CanteenComboSerializer,
    WeeklyMenuSerializer
)

class FoodCategoryViewSet(viewsets.ModelViewSet):
    queryset = FoodCategory.objects.all()
    serializer_class = FoodCategorySerializer

class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer

    @action(detail=False, methods=['get'])
    def price_chart(self, request):
        qs = self.get_queryset().filter(is_available=True)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

class DailyMenuViewSet(viewsets.ModelViewSet):
    queryset = DailyMenu.objects.all()
    serializer_class = DailyMenuSerializer

class CanteenIngredientViewSet(viewsets.ModelViewSet):
    queryset = CanteenIngredient.objects.all()
    serializer_class = CanteenIngredientSerializer

class CanteenDishViewSet(viewsets.ModelViewSet):
    queryset = CanteenDish.objects.all()
    serializer_class = CanteenDishSerializer

class CanteenComboViewSet(viewsets.ModelViewSet):
    queryset = CanteenCombo.objects.all()
    serializer_class = CanteenComboSerializer

class CanteenComplaintViewSet(viewsets.ModelViewSet):
    queryset = CanteenComplaint.objects.all()
    serializer_class = CanteenComplaintSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CanteenSupplierViewSet(viewsets.ModelViewSet):
    queryset = CanteenSupplier.objects.all()
    serializer_class = CanteenSupplierSerializer

class CanteenInventoryItemViewSet(viewsets.ModelViewSet):
    queryset = CanteenInventoryItem.objects.all()
    serializer_class = CanteenInventoryItemSerializer

class CanteenInventoryLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenInventoryLog.objects.all()
    serializer_class = CanteenInventoryLogSerializer

    def perform_create(self, serializer):
        log = serializer.save(recorded_by=self.request.user)
        # Update current stock
        item = log.item
        if log.log_type == 'in':
            item.current_stock += log.quantity
        elif log.log_type == 'out' or log.log_type == 'wastage':
            item.current_stock -= log.quantity
        item.save()

class CanteenWastageLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenWastageLog.objects.all()
    serializer_class = CanteenWastageLogSerializer

class CanteenConsumptionLogViewSet(viewsets.ModelViewSet):
    queryset = CanteenConsumptionLog.objects.all()
    serializer_class = CanteenConsumptionLogSerializer

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        total_servings = self.queryset.aggregate(Sum('total_servings'))['total_servings__sum'] or 0
        total_cost = self.queryset.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
        avg_rating = self.queryset.aggregate(Avg('average_rating'))['average_rating__avg'] or 0
        
        return Response({
            "total_servings": total_servings,
            "total_cost": total_cost,
            "average_rating": avg_rating
        })

class CanteenOrderViewSet(viewsets.ModelViewSet):
    queryset = CanteenOrder.objects.all()
    serializer_class = CanteenOrderSerializer

class WeeklyMenuViewSet(viewsets.ModelViewSet):
    queryset = WeeklyMenu.objects.all()
    serializer_class = WeeklyMenuSerializer
