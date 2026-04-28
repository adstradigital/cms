from django.urls import path
from . import views

urlpatterns = [
    # Analytics dashboard
    path("analytics/", views.payroll_analytics, name="payroll-analytics"),

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
    path("runs/<int:pk>/insights/", views.generate_ai_insights, name="payroll-run-insights"),

    # Payroll Entries (individual payslips)
    path("entries/<int:pk>/", views.payroll_entry_detail, name="payroll-entry-detail"),

    # Increment History
    path("increments/", views.increment_list, name="increment-list"),
    path("increments/<int:pk>/", views.increment_detail, name="increment-detail"),
    path("increments/generate-reason/", views.generate_increment_ai_reason, name="increment-ai-reason"),
]
