from django.db import models
from django.utils import timezone
from apps.accounts.models import User
from apps.students.models import Student

class FoodCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_food_categories"

class FoodItem(models.Model):
    CATEGORY_CHOICES = [
        ("breakfast", "Breakfast"),
        ("lunch", "Lunch"),
        ("snacks", "Snacks"),
        ("dinner", "Dinner"),
        ("juice", "Juice"),
        ("other", "Other"),
    ]
    
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_veg = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="canteen/food/", null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({'Veg' if self.is_veg else 'Non-Veg'})"

    class Meta:
        db_table = "canteen_food_items"

class DailyMenu(models.Model):
    MEAL_CHOICES = [
        ("breakfast", "Breakfast"),
        ("lunch", "Lunch"),
        ("snacks", "Snacks"),
        ("dinner", "Dinner"),
    ]
    
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES)
    items = models.ManyToManyField(FoodItem, related_name="menus")
    special_note = models.TextField(blank=True)
    
    class Meta:
        db_table = "canteen_daily_menus"
        unique_together = ("date", "meal_type")

class CanteenComplaint(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="canteen_complaints")
    date = models.DateField(default=timezone.now)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5) # 1-5 scale
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "canteen_complaints"
        ordering = ["-created_at"]

class CanteenSupplier(models.Model):
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    category = models.CharField(max_length=100, help_text="e.g. Vegetables, Dairy, Meat")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_suppliers"

class CanteenInventoryItem(models.Model):
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=20, default="kg")
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=12, decimal_places=2, default=5)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_inventory_items"

class CanteenInventoryLog(models.Model):
    LOG_TYPE = [("in", "Inbound"), ("out", "Outbound"), ("wastage", "Wastage")]
    
    item = models.ForeignKey(CanteenInventoryItem, on_delete=models.CASCADE, related_name="logs")
    log_type = models.CharField(max_length=10, choices=LOG_TYPE)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateTimeField(default=timezone.now)
    supplier = models.ForeignKey(CanteenSupplier, on_delete=models.SET_NULL, null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = "canteen_inventory_logs"

class CanteenWastageLog(models.Model):
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=DailyMenu.MEAL_CHOICES)
    item_name = models.CharField(max_length=150)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="kg")
    reason = models.TextField(blank=True)
    cost_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        db_table = "canteen_wastage_logs"

class CanteenConsumptionLog(models.Model):
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=DailyMenu.MEAL_CHOICES)
    total_servings = models.PositiveIntegerField()
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    class Meta:
        db_table = "canteen_consumption_logs"

class CanteenOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="canteen_orders")
    items = models.ManyToManyField(FoodItem)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(max_length=20, default="pending")

    class Meta:
        db_table = "canteen_orders"
        ordering = ["-order_date"]
