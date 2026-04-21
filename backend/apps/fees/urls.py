from django.urls import path
from . import views

urlpatterns = [
    # Fee Categories (Fee Heads)
    path("categories/", views.fee_category_list_view, name="fee-category-list"),
    path("categories/<int:pk>/", views.fee_category_detail_view, name="fee-category-detail"),

    # Fee Structures
    path("structures/", views.fee_structure_list_view, name="fee-structure-list"),
    path("structures/<int:pk>/", views.fee_structure_detail_view, name="fee-structure-detail"),
    path("structures/copy/", views.copy_fee_structure_view, name="fee-structure-copy"),

    # Fee Instalments
    path("instalments/", views.fee_instalment_list_view, name="fee-instalment-list"),
    path("instalments/<int:pk>/", views.fee_instalment_detail_view, name="fee-instalment-detail"),

    # Concessions
    path("concessions/", views.concession_list_view, name="concession-list"),
    path("concessions/<int:pk>/", views.concession_detail_view, name="concession-detail"),
    path("student-concessions/", views.student_concession_list_view, name="student-concession-list"),
    path("student-concessions/<int:pk>/", views.student_concession_detail_view, name="student-concession-detail"),

    # Fee Payments
    path("payments/", views.fee_payment_list_view, name="fee-payment-list"),
    path("payments/<int:pk>/", views.fee_payment_detail_view, name="fee-payment-detail"),

    # Reporting / Tracking
    path("students/<int:student_id>/statement/", views.student_fee_statement_view, name="student-fee-statement"),
    path("defaulters/", views.fee_defaulters_view, name="fee-defaulters"),
    path("section-overview/", views.fee_section_overview_view, name="fee-section-overview"),

    # Donations
    path("donations/", views.donation_list_view, name="donation-list"),
    path("donations/<int:pk>/", views.donation_detail_view, name="donation-detail"),

    # Budgets
    path("budgets/", views.annual_budget_list_view, name="annual-budget-list"),
    path("budgets/<int:pk>/", views.annual_budget_detail_view, name="annual-budget-detail"),
    path("budgets/<int:pk>/items/", views.budget_items_view, name="budget-items"),
    path("budget-items/", views.budget_item_create_view, name="budget-item-create"),
    path("budget-items/<int:pk>/", views.budget_item_detail_view, name="budget-item-detail"),
]
