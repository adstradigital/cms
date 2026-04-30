from django.db import models
from django.utils import timezone

from apps.accounts.models import User
from apps.students.models import Student


class SchoolBus(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("maintenance", "Maintenance"),
        ("inactive", "Inactive"),
    ]

    name = models.CharField(max_length=100)
    bus_number = models.CharField(max_length=30, unique=True)
    registration_number = models.CharField(max_length=30, blank=True)
    capacity = models.PositiveSmallIntegerField(default=40)
    driver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_buses",
    )
    attendant_name = models.CharField(max_length=100, blank=True)
    attendant_phone = models.CharField(max_length=20, blank=True)
    driver_name = models.CharField(max_length=100, blank=True)
    driver_phone = models.CharField(max_length=20, blank=True)
    tracker_device_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.bus_number} - {self.name}"

    class Meta:
        db_table = "school_buses"
        ordering = ["bus_number"]


class TransportRoute(models.Model):
    name = models.CharField(max_length=100)
    bus = models.ForeignKey(
        SchoolBus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routes",
    )
    driver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routes",
    )
    vehicle_number = models.CharField(max_length=20, blank=True)
    vehicle_capacity = models.PositiveSmallIntegerField(default=40)
    source = models.CharField(max_length=120, blank=True)
    destination = models.CharField(max_length=120, blank=True)
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    scheduled_pickup_time = models.TimeField(null=True, blank=True)
    scheduled_drop_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "transport_routes"


class RouteStop(models.Model):
    route = models.ForeignKey(TransportRoute, on_delete=models.CASCADE, related_name="stops")
    stop_name = models.CharField(max_length=100)
    stop_order = models.PositiveSmallIntegerField()
    pickup_time = models.TimeField(null=True, blank=True)
    drop_time = models.TimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"{self.route.name} - Stop {self.stop_order}: {self.stop_name}"

    class Meta:
        db_table = "route_stops"
        ordering = ["stop_order"]


class StudentTransport(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="transport")
    stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, related_name="students")
    join_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.student} - {self.stop.stop_name}"

    class Meta:
        db_table = "student_transport"


class StudentTransportLog(models.Model):
    SOURCE_CHOICES = [
        ("manual", "Manual Entry"),
        ("mobile", "Mobile App"),
        ("rfid", "RFID/Scanner"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="transport_logs")
    route = models.ForeignKey(
        TransportRoute,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_logs",
    )
    bus = models.ForeignKey(
        SchoolBus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_logs",
    )
    stop = models.ForeignKey(
        RouteStop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_logs",
    )
    date = models.DateField(db_index=True)
    boarding_time = models.TimeField(null=True, blank=True)
    exiting_time = models.TimeField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_student_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} â€” {self.date}"

    class Meta:
        db_table = "student_transport_logs"
        unique_together = ("student", "date")
        ordering = ["-date", "student_id"]
        indexes = [
            models.Index(fields=["date", "route"], name="stud_trlog_date_route_idx"),
            models.Index(fields=["student", "date"], name="stud_trlog_student_date_idx"),
        ]


class BusLocationLog(models.Model):
    SOURCE_CHOICES = [
        ("gps", "GPS Device"),
        ("mobile", "Mobile App"),
        ("manual", "Manual Entry"),
    ]

    bus = models.ForeignKey(SchoolBus, on_delete=models.CASCADE, related_name="location_logs")
    route = models.ForeignKey(
        TransportRoute,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="location_logs",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    speed_kmph = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    heading = models.PositiveSmallIntegerField(null=True, blank=True)
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="gps")
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_locations_reported",
    )

    def __str__(self):
        return f"{self.bus.bus_number} @ {self.recorded_at}"

    class Meta:
        db_table = "bus_location_logs"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["bus", "recorded_at"])]


class TransportFee(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("waived", "Waived"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("card", "Card"),
        ("upi", "UPI"),
        ("bank_transfer", "Bank Transfer"),
        ("cheque", "Cheque"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="transport_fees")
    route = models.ForeignKey(
        TransportRoute,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fee_records",
    )
    period_label = models.CharField(max_length=50)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True)
    transaction_id = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    remarks = models.TextField(blank=True)
    collected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_fees_collected",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - {self.period_label} - {self.status}"

    class Meta:
        db_table = "transport_fees"
        ordering = ["-due_date", "-created_at"]
        unique_together = ["student", "period_label"]


class TransportFeePayment(models.Model):
    fee = models.ForeignKey(TransportFee, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_method = models.CharField(max_length=20, choices=TransportFee.PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=120, blank=True)
    remarks = models.TextField(blank=True)
    collected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_payments_collected",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment of {self.amount} for {self.fee}"

    class Meta:
        db_table = "transport_fee_payments"
        ordering = ["-payment_date", "-created_at"]


class TransportComplaint(models.Model):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_complaints",
    )
    raised_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="transport_complaints",
    )
    route = models.ForeignKey(
        TransportRoute,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    bus = models.ForeignKey(
        SchoolBus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    subject = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    resolution_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_complaints_resolved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.subject} - {self.status}"

    class Meta:
        db_table = "transport_complaints"
        ordering = ["-created_at"]
