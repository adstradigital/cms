from django.urls import path
from . import views

urlpatterns = [
    # Fee Categories
    path("categories/", views.fee_category_list_view, name="fee-category-list"),
    path("categories/<int:pk>/", views.fee_category_detail_view, name="fee-category-detail"),

    # Fee Structure
    path("structures/", views.fee_structure_list_view, name="fee-structure-list"),
    path("structures/<int:pk>/", views.fee_structure_detail_view, name="fee-structure-detail"),

    # Fee Payments
    path("payments/", views.fee_payment_list_view, name="fee-payment-list"),
    path("payments/<int:pk>/", views.fee_payment_detail_view, name="fee-payment-detail"),

    # Student Fee Statement & Defaulters
    path("students/<int:student_id>/statement/", views.student_fee_statement_view, name="student-fee-statement"),
    path("defaulters/", views.fee_defaulters_view, name="fee-defaulters"),
    path("section-overview/", views.fee_section_overview_view, name="fee-section-overview"),
]
