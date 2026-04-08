from django.db import models
from django.utils import timezone
from apps.students.models import Student
from apps.accounts.models import User


MEAL_TYPE_CHOICES = [
    ("breakfast", "Breakfast"),
    ("lunch", "Lunch"),
    ("snacks", "Snacks"),
    ("dinner", "Dinner"),
]


class Hostel(models.Model):
    GENDER_CHOICES = [
        ("boys", "Boys"),
        ("girls", "Girls"),
        ("mixed", "Mixed"),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="boys")
    warden = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="managed_hostels"
    )
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    total_floors = models.PositiveSmallIntegerField(default=1)
    total_capacity = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "hostels"


class Floor(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="floors")
    number = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.hostel.name} - Floor {self.number}"

    class Meta:
        db_table = "hostel_floors"
        unique_together = ("hostel", "number")
        ordering = ["number"]


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ("single", "Single"),
        ("double", "Double"),
        ("triple", "Triple"),
        ("dormitory", "Dormitory"),
    ]
    AC_CHOICES = [
        ("ac", "AC"),
        ("non_ac", "Non-AC"),
    ]
    STATUS_CHOICES = [
        ("available", "Available"),
        ("full", "Full"),
        ("maintenance", "Under Maintenance"),
        ("reserved", "Reserved"),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="rooms")
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=20)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default="double")
    ac_type = models.CharField(max_length=10, choices=AC_CHOICES, default="non_ac")
    capacity = models.PositiveSmallIntegerField(default=2)
    occupied = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    monthly_rent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    amenities = models.TextField(blank=True, help_text="Comma-separated list of amenities")
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.hostel.name} - Room {self.room_number}"

    @property
    def available_beds(self):
        return self.capacity - self.occupied

    @property
    def occupancy_percent(self):
        if self.capacity == 0:
            return 0
        return round((self.occupied / self.capacity) * 100)

    def update_status(self):
        if self.status == "maintenance":
            return
        if self.occupied >= self.capacity:
            self.status = "full"
        else:
            self.status = "available"

    class Meta:
        db_table = "hostel_rooms"
        unique_together = ("hostel", "room_number")


class RoomAllotment(models.Model):
    student = models.OneToOneField(
        Student, on_delete=models.CASCADE, related_name="hostel_allotment"
    )
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="allotments")
    allotted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="allotments_made"
    )
    join_date = models.DateField(default=timezone.now)
    leave_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} -> {self.room}"

    class Meta:
        db_table = "room_allotments"


class RoomTransfer(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="room_transfers")
    from_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, related_name="transfers_out")
    to_room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="transfers_in")
    transferred_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="transfers_executed"
    )
    reason = models.TextField(blank=True)
    transfer_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} | {self.from_room} -> {self.to_room}"

    class Meta:
        db_table = "room_transfers"
        ordering = ["-transfer_date"]


class NightAttendance(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("on_leave", "On Leave"),
        ("out_pass", "Out Pass"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="night_attendances")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="night_attendances")
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    marked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="night_attendance_marked"
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"

    class Meta:
        db_table = "night_attendance"
        unique_together = ("student", "date")
        ordering = ["-date"]


class EntryExitLog(models.Model):
    DIRECTION_CHOICES = [("entry", "Entry"), ("exit", "Exit")]
    PURPOSE_CHOICES = [
        ("regular", "Regular"),
        ("outing", "Outing"),
        ("medical", "Medical"),
        ("emergency", "Emergency"),
        ("other", "Other"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="entry_exit_logs")
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default="regular")
    timestamp = models.DateTimeField(default=timezone.now)
    logged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="gate_logs"
    )
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.student} - {self.direction} @ {self.timestamp}"

    class Meta:
        db_table = "entry_exit_logs"
        ordering = ["-timestamp"]


class RuleViolation(models.Model):
    SEVERITY_CHOICES = [
        ("minor", "Minor"),
        ("moderate", "Moderate"),
        ("major", "Major"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("resolved", "Resolved"),
        ("appealed", "Appealed"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="violations")
    violation_date = models.DateField(default=timezone.now)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="minor")
    action_taken = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    reported_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="violations_reported"
    )
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="violations_resolved"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.severity} - {self.violation_date}"

    class Meta:
        db_table = "hostel_violations"
        ordering = ["-violation_date"]


class VisitorLog(models.Model):
    RELATION_CHOICES = [
        ("parent", "Parent"),
        ("sibling", "Sibling"),
        ("relative", "Relative"),
        ("friend", "Friend"),
        ("guardian", "Guardian"),
        ("other", "Other"),
    ]
    APPROVAL_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("denied", "Denied"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="visitor_logs")
    visitor_name = models.CharField(max_length=150)
    visitor_phone = models.CharField(max_length=20)
    visitor_id_proof = models.CharField(max_length=100, blank=True)
    relation = models.CharField(max_length=20, choices=RELATION_CHOICES, default="parent")
    purpose = models.TextField(blank=True)
    check_in = models.DateTimeField(default=timezone.now)
    check_out = models.DateTimeField(null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default="pending")
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="visitor_approvals"
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.visitor_name} visiting {self.student} - {self.check_in.date()}"

    class Meta:
        db_table = "visitor_logs"
        ordering = ["-check_in"]


class HostelFee(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("partial", "Partial"),
        ("overdue", "Overdue"),
        ("waived", "Waived"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("cheque", "Cheque"),
        ("dd", "Demand Draft"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="hostel_fees")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, related_name="hostel_fees")
    period_label = models.CharField(max_length=50)
    room_rent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    electricity_charges = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mess_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    collected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="hostel_fees_collected"
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.period_label} - {self.status}"

    class Meta:
        db_table = "hostel_fees"
        ordering = ["-due_date"]


class MessMenuPlan(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_menu_plans")
    plan_date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    items = models.TextField(help_text="Comma-separated dish list")
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="mess_menus_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.hostel.name} | {self.plan_date} | {self.meal_type}"

    class Meta:
        db_table = "mess_menu_plans"
        unique_together = ("hostel", "plan_date", "meal_type")
        ordering = ["-plan_date", "meal_type"]


class MessMealAttendance(models.Model):
    STATUS_CHOICES = [
        ("ate", "Ate"),
        ("skipped", "Skipped"),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_meal_attendance")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="mess_meal_attendance")
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ate")
    remarks = models.TextField(blank=True)
    marked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="mess_attendance_marked"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} | {self.date} | {self.meal_type} | {self.status}"

    class Meta:
        db_table = "mess_meal_attendance"
        unique_together = ("student", "date", "meal_type")
        ordering = ["-date", "meal_type"]


class MessDietProfile(models.Model):
    PREFERENCE_CHOICES = [
        ("veg", "Veg"),
        ("non_veg", "Non-Veg"),
        ("eggetarian", "Eggetarian"),
        ("vegan", "Vegan"),
    ]

    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="mess_diet_profile")
    preference = models.CharField(max_length=20, choices=PREFERENCE_CHOICES, default="veg")
    allergies = models.TextField(blank=True)
    restrictions = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} | {self.preference}"

    class Meta:
        db_table = "mess_diet_profiles"


class MessFeedback(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_feedback")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="mess_feedback")
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    rating = models.PositiveSmallIntegerField(default=5)
    complaint = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} | {self.date} | {self.meal_type}"

    class Meta:
        db_table = "mess_feedback"
        ordering = ["-created_at"]


class MessInventoryItem(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_inventory_items")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=80, blank=True)
    unit = models.CharField(max_length=20, default="kg")
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.hostel.name} | {self.name}"

    class Meta:
        db_table = "mess_inventory_items"
        unique_together = ("hostel", "name")
        ordering = ["name"]


class MessInventoryLog(models.Model):
    LOG_TYPE_CHOICES = [
        ("in", "Stock In"),
        ("out", "Stock Out"),
        ("adjustment", "Adjustment"),
    ]

    item = models.ForeignKey(MessInventoryItem, on_delete=models.CASCADE, related_name="logs")
    log_type = models.CharField(max_length=20, choices=LOG_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(default=timezone.now)
    logged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="mess_inventory_logged"
    )

    def __str__(self):
        return f"{self.item.name} | {self.log_type} | {self.quantity}"

    class Meta:
        db_table = "mess_inventory_logs"
        ordering = ["-logged_at"]


class MessVendor(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_vendors")
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.hostel.name} | {self.name}"

    class Meta:
        db_table = "mess_vendors"
        unique_together = ("hostel", "name")
        ordering = ["name"]


class MessVendorSupply(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
    ]

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_vendor_supplies")
    vendor = models.ForeignKey(MessVendor, on_delete=models.CASCADE, related_name="supplies")
    item_name = models.CharField(max_length=120)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default="kg")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supply_date = models.DateField(default=timezone.now)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vendor.name} | {self.item_name} | {self.amount}"

    class Meta:
        db_table = "mess_vendor_supplies"
        ordering = ["-supply_date"]


class MessWastageLog(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_wastage_logs")
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    item_name = models.CharField(max_length=120)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reason = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="mess_wastage_recorded"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.hostel.name} | {self.date} | {self.item_name}"

    class Meta:
        db_table = "mess_wastage_logs"
        ordering = ["-date", "-created_at"]


class MessConsumptionLog(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="mess_consumption_logs")
    date = models.DateField(default=timezone.now)
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    item_name = models.CharField(max_length=120)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    student_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="mess_consumption_recorded"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.hostel.name} | {self.date} | {self.item_name}"

    class Meta:
        db_table = "mess_consumption_logs"
        ordering = ["-date", "-created_at"]
