from django.db import models
from django.utils import timezone
from apps.accounts.models import User
from apps.students.models import Student
from apps.staff.models import Staff


class FoodCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True, default='🍽️')
    color = models.CharField(max_length=20, blank=True, default='#6366F1')

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_food_categories"


class FoodItem(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("out_of_stock", "Out of Stock"),
    ]

    name = models.CharField(max_length=100)
    category = models.ForeignKey(FoodCategory, on_delete=models.CASCADE, related_name="food_items")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_veg = models.BooleanField(default=True)
    # is_available was removed in migration 0011 — use status instead
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="canteen/food/", null=True, blank=True)
    # New fields — will be added via migration
    preparation_time = models.PositiveIntegerField(default=15, help_text="Estimated prep time in minutes")
    stock_count = models.PositiveIntegerField(default=100, help_text="Daily available quantity")
    times_ordered = models.PositiveIntegerField(default=0, help_text="Total times ordered")

    @property
    def is_available(self):
        return self.status == "active"

    def __str__(self):
        return f"{self.name} ({self.category.name})"

    class Meta:
        db_table = "canteen_food_items"


class CanteenIngredient(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_ingredients"


class CanteenDish(models.Model):
    DISH_TYPE_CHOICES = [
        ("solid", "Solid Item (e.g. Idli, Dosa)"),
        ("liquid", "Liquid Item (e.g. Sambar, Chutney)"),
        ("full_meal", "Full Meal (e.g. Biriyani)"),
    ]

    name = models.CharField(max_length=150)
    dish_type = models.CharField(max_length=50, blank=True, null=True)
    ingredients = models.ManyToManyField(CanteenIngredient, related_name="dishes")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_veg = models.BooleanField(null=True, blank=True, default=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_dishes"


class DailyMenu(models.Model):
    MEAL_CHOICES = [
        ("breakfast", "Breakfast"),
        ("lunch", "Lunch"),
        ("snacks", "Snacks"),
        ("dinner", "Dinner"),
    ]

    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES, null=True, blank=True)
    items = models.TextField(blank=True)         # legacy field
    dish_name = models.CharField(max_length=200, blank=True)

    food_items = models.ManyToManyField(FoodItem, blank=True, related_name="daily_menus")
    dishes = models.ManyToManyField(CanteenDish, blank=True, related_name="menus")
    ingredients = models.ManyToManyField(CanteenIngredient, blank=True, related_name="menu_extras")

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
    rating = models.PositiveSmallIntegerField(default=5)
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
    meal_type = models.CharField(max_length=20, choices=DailyMenu.MEAL_CHOICES, null=True, blank=True)
    item_name = models.CharField(max_length=150)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default="kg")
    reason = models.TextField(blank=True)
    cost_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "canteen_wastage_logs"


class CanteenConsumptionLog(models.Model):
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=DailyMenu.MEAL_CHOICES, null=True, blank=True)
    total_servings = models.PositiveIntegerField()
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    class Meta:
        db_table = "canteen_consumption_logs"


class CanteenCombo(models.Model):
    name = models.CharField(max_length=150)
    dishes = models.ManyToManyField(CanteenDish, related_name="combos")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_veg = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "canteen_combos"


class WeeklyMenu(models.Model):
    DAY_CHOICES = [
        ("Monday", "Monday"), ("Tuesday", "Tuesday"), ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"), ("Friday", "Friday"),
    ]
    MEAL_CHOICES = [("Breakfast", "Breakfast"), ("Lunch", "Lunch")]

    day = models.CharField(max_length=20, choices=DAY_CHOICES)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES)
    title = models.CharField(max_length=200, help_text="Menu header, e.g. Special Breakfast")
    items = models.JSONField(default=list, help_text="List of menu items/dishes")
    food_items = models.ManyToManyField(FoodItem, blank=True, related_name="weekly_menus")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "canteen_weekly_menus"
        ordering = ["day", "meal_type"]
        unique_together = [("day", "meal_type")]


class CanteenNotification(models.Model):
    TYPE_CHOICES = [
        ("order", "New Order"),
        ("stock", "Low Stock"),
        ("system", "System Alert"),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "canteen_notifications"
        ordering = ["-created_at"]


class CanteenOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("card", "Card"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="canteen_orders", null=True, blank=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="canteen_orders", null=True, blank=True)
    ordered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="placed_canteen_orders")
    items = models.ManyToManyField(FoodItem, blank=True, related_name="orders")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="cash")
    payment_status = models.CharField(max_length=20, default="pending")
    notes = models.TextField(blank=True)
    token_number = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-order_date"]


class OrderItem(models.Model):
    order = models.ForeignKey(CanteenOrder, on_delete=models.CASCADE, related_name="order_items")
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "canteen_order_items"


class CanteenPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("card", "Card"),
    ]

    order = models.OneToOneField(CanteenOrder, on_delete=models.CASCADE, related_name="payment_detail")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="cash")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    is_refunded = models.BooleanField(default=False)
    refund_note = models.TextField(blank=True)

    @property
    def created_at(self):
        return self.payment_date

    @property
    def status(self):
        return "refunded" if self.is_refunded else "completed"

    class Meta:
        db_table = "canteen_payments"
        ordering = ["-payment_date"]
