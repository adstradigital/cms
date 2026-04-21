from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FoodItemViewSet, DailyMenuViewSet, CanteenComplaintViewSet,
    CanteenSupplierViewSet, CanteenInventoryItemViewSet,
    CanteenInventoryLogViewSet, CanteenWastageLogViewSet,
    CanteenConsumptionLogViewSet, FoodCategoryViewSet, CanteenOrderViewSet,
    CanteenIngredientViewSet, CanteenDishViewSet, CanteenComboViewSet, WeeklyMenuViewSet,
    OrderItemViewSet, CanteenPaymentViewSet,
    canteen_dashboard_view, canteen_reports_view,
)

router = DefaultRouter()
router.register(r'food-items', FoodItemViewSet)
router.register(r'food-categories', FoodCategoryViewSet)
router.register(r'daily-menu', DailyMenuViewSet)
router.register(r'weekly-menu', WeeklyMenuViewSet)
router.register(r'complaints', CanteenComplaintViewSet)
router.register(r'suppliers', CanteenSupplierViewSet)
router.register(r'inventory-items', CanteenInventoryItemViewSet)
router.register(r'inventory-logs', CanteenInventoryLogViewSet)
router.register(r'wastage-logs', CanteenWastageLogViewSet)
router.register(r'consumption-logs', CanteenConsumptionLogViewSet)
router.register(r'orders', CanteenOrderViewSet)
router.register(r'order-items', OrderItemViewSet)
router.register(r'payments', CanteenPaymentViewSet)
router.register(r'ingredients', CanteenIngredientViewSet)
router.register(r'dishes', CanteenDishViewSet)
router.register(r'combos', CanteenComboViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', canteen_dashboard_view, name='canteen-dashboard'),
    path('reports/', canteen_reports_view, name='canteen-reports'),
]
