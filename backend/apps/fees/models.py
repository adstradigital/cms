from django.db import models
from apps.accounts.models import AcademicYear
from apps.students.models import Class, Student


class FeeCategory(models.Model):
    name = models.CharField(max_length=100)         # Tuition, Transport, Hostel…
    description = models.TextField(blank=True)
    is_optional = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "fee_categories"


class FeeStructure(models.Model):
    TERM_CHOICES = [
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("half_yearly", "Half Yearly"),
        ("annually", "Annually"),
        ("one_time", "One Time"),
    ]
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="fee_structures")
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="fee_structures")
    category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE, related_name="fee_structures")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    term = models.CharField(max_length=20, choices=TERM_CHOICES, default="monthly")
    late_fine_per_day = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.school_class.name} — {self.category.name} — {self.amount}"

    class Meta:
        db_table = "fee_structures"


class FeePayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("cheque", "Cheque"),
        ("dd", "Demand Draft"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("partial", "Partial"),
        ("overdue", "Overdue"),
        ("waived", "Waived"),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="fee_payments")
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name="payments")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    late_fine = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default="cash")
    transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    payment_date = models.DateField(null=True, blank=True)
    collected_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="fees_collected")
    receipt_number = models.CharField(max_length=50, unique=True, blank=True)
    receipt_file = models.FileField(upload_to="receipts/", null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} — {self.fee_structure.category.name} — {self.status}"

    class Meta:
        db_table = "fee_payments"