from django.contrib import admin
from .models import (
    FoodItem, DailyMenu, CanteenComplaint, CanteenSupplier,
    CanteenInventoryItem, CanteenInventoryLog, CanteenWastageLog,
    CanteenConsumptionLog, FoodCategory, CanteenOrder, OrderItem, CanteenPayment,
    CanteenIngredient, CanteenDish, CanteenCombo, WeeklyMenu, CanteenNotification
)

@admin.register(FoodCategory)
class FoodCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'color')
    search_fields = ('name',)

@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'status', 'is_veg', 'stock_count')
    list_filter = ('category', 'status', 'is_veg')
    search_fields = ('name', 'description')

@admin.register(CanteenIngredient)
class CanteenIngredientAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(CanteenDish)
class CanteenDishAdmin(admin.ModelAdmin):
    list_display = ('name', 'dish_type', 'price', 'is_veg')
    list_filter = ('dish_type', 'is_veg')
    search_fields = ('name',)

@admin.register(DailyMenu)
class DailyMenuAdmin(admin.ModelAdmin):
    list_display = ('date', 'meal_type', 'dish_name')
    list_filter = ('date', 'meal_type')
    filter_horizontal = ('food_items', 'dishes', 'ingredients')

@admin.register(CanteenOrder)
class CanteenOrderAdmin(admin.ModelAdmin):
    list_display = ('token_number', 'student', 'total_amount', 'status', 'payment_method', 'order_date')
    list_filter = ('status', 'payment_method', 'order_date')
    search_fields = ('token_number', 'notes')

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'food_item', 'quantity', 'subtotal')

@admin.register(CanteenPayment)
class CanteenPaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'payment_method', 'amount', 'is_refunded', 'payment_date')
    list_filter = ('payment_method', 'is_refunded', 'payment_date')

@admin.register(CanteenComplaint)
class CanteenComplaintAdmin(admin.ModelAdmin):
    list_display = ('user', 'subject', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating')
    search_fields = ('subject', 'description')

@admin.register(CanteenSupplier)
class CanteenSupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'display_categories', 'is_active')
    list_filter = ('categories', 'is_active')
    search_fields = ('name', 'contact_person')
    filter_horizontal = ('categories',)

    def display_categories(self, obj):
        return ", ".join([c.name for c in obj.categories.all()])
    display_categories.short_description = 'Categories'

@admin.register(CanteenInventoryItem)
class CanteenInventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'current_stock', 'unit', 'min_stock_level')
    list_filter = ('category',)
    search_fields = ('name',)

@admin.register(CanteenInventoryLog)
class CanteenInventoryLogAdmin(admin.ModelAdmin):
    list_display = ('item', 'log_type', 'quantity', 'date', 'recorded_by')
    list_filter = ('log_type', 'date')

@admin.register(CanteenWastageLog)
class CanteenWastageLogAdmin(admin.ModelAdmin):
    list_display = ('date', 'meal_type', 'item_name', 'quantity', 'cost_loss')
    list_filter = ('date', 'meal_type')

@admin.register(CanteenConsumptionLog)
class CanteenConsumptionLogAdmin(admin.ModelAdmin):
    list_display = ('date', 'meal_type', 'total_servings', 'total_cost', 'average_rating')
    list_filter = ('date', 'meal_type')

@admin.register(CanteenCombo)
class CanteenComboAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_veg', 'is_available')
    filter_horizontal = ('dishes',)

@admin.register(WeeklyMenu)
class WeeklyMenuAdmin(admin.ModelAdmin):
    list_display = ('day', 'meal_type', 'title')
    list_filter = ('day', 'meal_type')

@admin.register(CanteenNotification)
class CanteenNotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'message', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
