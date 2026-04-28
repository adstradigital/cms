from django.db import models
from apps.accounts.models import User, AcademicYear
from apps.staff.models import Staff


# ─── Salary Structure ─────────────────────────────────────────────────────────

class SalaryStructure(models.Model):
    """Defines the salary breakdown template for a grade/designation."""
    designation = models.CharField(max_length=100)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="% of basic")
    da_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="% of basic")
    ta_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Fixed transport allowance")
    medical_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    def gross_salary(self):
        hra = self.basic_salary * self.hra_percent / 100
        da = self.basic_salary * self.da_percent / 100
        return self.basic_salary + hra + da + self.ta_amount + self.medical_allowance + self.other_allowances

    def __str__(self):
        return f"{self.designation} — ₹{self.basic_salary}"

    class Meta:
        db_table = "salary_structures"


# ─── Deduction Type ───────────────────────────────────────────────────────────

class DeductionType(models.Model):
    CALC_CHOICES = [
        ("fixed", "Fixed Amount"),
        ("percent", "Percentage of Basic"),
    ]
    name = models.CharField(max_length=100)
    calculation_type = models.CharField(max_length=10, choices=CALC_CHOICES, default="fixed")
    value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_mandatory = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "deduction_types"


# ─── Payroll Run ──────────────────────────────────────────────────────────────

class PayrollRun(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("processed", "Processed"),
        ("paid", "Paid"),
    ]
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, related_name="payroll_runs")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="draft")
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="payroll_runs_processed")
    processed_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payroll {self.month}/{self.year} — {self.status}"

    class Meta:
        db_table = "payroll_runs"
        ordering = ["-year", "-month"]
        unique_together = [("month", "year")]


# ─── Payroll Entry (per staff per run) ───────────────────────────────────────

class PayrollEntry(models.Model):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="entries")
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="payroll_entries")
    salary_structure = models.ForeignKey(SalaryStructure, on_delete=models.SET_NULL, null=True, related_name="entries")

    # Earnings
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    da = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    incentive_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    increment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Deductions
    pf_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    esi_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tds_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Net
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    working_days = models.PositiveSmallIntegerField(default=26)
    paid_days = models.PositiveSmallIntegerField(default=26)
    attendance_pct = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, blank=True)

    # AI-generated narrative explanations
    ai_deduction_reason = models.TextField(blank=True)
    ai_increment_reason = models.TextField(blank=True)
    ai_incentive_reason = models.TextField(blank=True)
    ai_overall_summary = models.TextField(blank=True)

    def __str__(self):
        return f"{self.staff} — {self.payroll_run}"

    class Meta:
        db_table = "payroll_entries"
        unique_together = [("payroll_run", "staff")]


# ─── Increment / Bonus History ────────────────────────────────────────────────

class IncrementHistory(models.Model):
    INCREMENT_TYPES = [
        ("merit", "Merit / Performance"),
        ("promotion", "Promotion"),
        ("annual", "Annual Revision"),
        ("adjustment", "Salary Adjustment"),
    ]
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="increment_history")
    salary_structure = models.ForeignKey(
        SalaryStructure, on_delete=models.SET_NULL, null=True, blank=True, related_name="increment_history"
    )
    increment_type = models.CharField(max_length=20, choices=INCREMENT_TYPES, default="annual")
    old_basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    increment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reason = models.TextField(blank=True)
    ai_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_increments"
    )
    effective_from = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.staff} — +₹{self.increment_amount} ({self.increment_type})"

    class Meta:
        db_table = "increment_history"
        ordering = ["-effective_from"]
