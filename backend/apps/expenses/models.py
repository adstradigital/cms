from django.db import models
from apps.accounts.models import User, AcademicYear
from apps.staff.models import Staff


# ─── Expense Category ─────────────────────────────────────────────────────────

class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "expense_categories"
        ordering = ["name"]


# ─── Expense Entry ────────────────────────────────────────────────────────────

class ExpenseEntry(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("paid", "Paid"),
    ]
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, related_name="entries")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField()
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, related_name="expenses")
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="submitted_expenses")
    receipt_file = models.FileField(upload_to="expense_receipts/", null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} — ₹{self.amount}"

    class Meta:
        db_table = "expense_entries"
        ordering = ["-expense_date"]


# ─── Expense Approval ─────────────────────────────────────────────────────────

class ExpenseApproval(models.Model):
    ACTION_CHOICES = [
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    expense = models.OneToOneField(ExpenseEntry, on_delete=models.CASCADE, related_name="approval")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="expense_approvals")
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    remarks = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.expense.title} — {self.action}"

    class Meta:
        db_table = "expense_approvals"
