from django.db import models
from apps.accounts.models import AcademicYear, User
from apps.students.models import Class, Student


# ─── Fee Head / Category ─────────────────────────────────────────────────────

class FeeCategory(models.Model):
    FEE_TYPE_CHOICES = [
        ("academic", "Academic"),
        ("transport", "Transport"),
        ("hostel", "Hostel"),
        ("miscellaneous", "Miscellaneous"),
    ]
    name = models.CharField(max_length=100)         # Tuition, Lab, Library…
    description = models.TextField(blank=True)
    fee_type = models.CharField(max_length=20, choices=FEE_TYPE_CHOICES, default="academic")
    is_optional = models.BooleanField(default=False)    # Mandatory toggle
    is_refundable = models.BooleanField(default=False)  # Caution Deposit etc.

    def __str__(self):
        return self.name

    class Meta:
        db_table = "fee_categories"


# ─── Fee Structure (per class, per year) ─────────────────────────────────────

class FeeStructure(models.Model):
    TERM_CHOICES = [
        ("one_time", "One Time"),
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("half_yearly", "Half Yearly"),
        ("annually", "Annually"),
        ("per_term", "Per Term"),
    ]
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="fee_structures")
    school_class = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="fee_structures")
    category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE, related_name="fee_structures")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    term = models.CharField(max_length=20, choices=TERM_CHOICES, default="monthly")
    is_mandatory = models.BooleanField(default=True)
    late_fine_per_day = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.school_class.name} — {self.category.name} — {self.amount}"

    class Meta:
        db_table = "fee_structures"


# ─── Fee Instalment Plan ──────────────────────────────────────────────────────

class FeeInstalment(models.Model):
    """Break an annual fee into multiple instalments."""
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name="instalments")
    instalment_number = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()

    def __str__(self):
        return f"{self.fee_structure} — Instalment {self.instalment_number}"

    class Meta:
        db_table = "fee_instalments"
        ordering = ["instalment_number"]


# ─── Concession / Scholarship ─────────────────────────────────────────────────

class Concession(models.Model):
    CONCESSION_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("fixed", "Fixed Amount"),
        ("full_waiver", "Full Waiver"),
    ]
    name = models.CharField(max_length=100)   # Sibling discount, Merit scholarship…
    concession_type = models.CharField(max_length=20, choices=CONCESSION_TYPE_CHOICES, default="percentage")
    value = models.DecimalField(max_digits=8, decimal_places=2, default=0)  # % or ₹ amount
    applicable_category = models.ForeignKey(FeeCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="concessions")
    is_active = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "fee_concessions"


class StudentConcession(models.Model):
    """Concession assigned to a specific student."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="concessions")
    concession = models.ForeignKey(Concession, on_delete=models.CASCADE, related_name="student_concessions")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="student_concessions")
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="approved_concessions")
    approved_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.student} — {self.concession.name}"

    class Meta:
        db_table = "student_concessions"


# ─── Fee Payment ──────────────────────────────────────────────────────────────

class FeePayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"),
        ("online", "Online"),
        ("cheque", "Cheque"),
        ("dd", "Demand Draft"),
        ("upi", "UPI"),
        ("neft", "NEFT/RTGS"),
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
    instalment = models.ForeignKey(FeeInstalment, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    concession_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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


# ─── Donation ─────────────────────────────────────────────────────────────────

class Donation(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("cash", "Cash"), ("cheque", "Cheque"), ("online", "Online"),
        ("upi", "UPI"), ("neft", "NEFT/RTGS"),
    ]
    donor_name = models.CharField(max_length=200)
    donor_email = models.EmailField(blank=True)
    donor_phone = models.CharField(max_length=20, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default="cash")
    transaction_id = models.CharField(max_length=100, blank=True)
    donation_date = models.DateField()
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True, related_name="donations")
    receipt_number = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="donations_recorded")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.donor_name} — ₹{self.amount}"

    class Meta:
        db_table = "donations"
        ordering = ["-donation_date"]


# ─── Annual Budget ────────────────────────────────────────────────────────────

class AnnualBudget(models.Model):
    STATUS_CHOICES = [("draft", "Draft"), ("approved", "Approved"), ("finalized", "Finalized")]
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="budgets")
    title = models.CharField(max_length=200, default="Annual Budget")
    total_allocated = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="draft")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_budgets")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — {self.academic_year}"

    class Meta:
        db_table = "annual_budgets"


class BudgetItem(models.Model):
    budget = models.ForeignKey(AnnualBudget, on_delete=models.CASCADE, related_name="items")
    category = models.CharField(max_length=100)  # e.g. "Infrastructure", "Staff Salary", "Events"
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spent_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    @property
    def variance(self):
        return self.allocated_amount - self.spent_amount

    def __str__(self):
        return f"{self.budget} — {self.category}"

    class Meta:
        db_table = "budget_items"