from django.urls import path
from . import views

urlpatterns = [
    # Salary Structures
    path("salary-structures/", views.salary_structure_list, name="salary-structure-list"),
    path("salary-structures/<int:pk>/", views.salary_structure_detail, name="salary-structure-detail"),
    # Deduction Types
    path("deductions/", views.deduction_type_list, name="deduction-type-list"),
    path("deductions/<int:pk>/", views.deduction_type_detail, name="deduction-type-detail"),
    # Payroll Runs
    path("runs/", views.payroll_run_list, name="payroll-run-list"),
    path("runs/<int:pk>/", views.payroll_run_detail, name="payroll-run-detail"),
    path("runs/<int:pk>/process/", views.process_payroll_run, name="payroll-run-process"),
    # Payroll Entries (payslips)
    path("entries/<int:pk>/", views.payroll_entry_detail, name="payroll-entry-detail"),
]
