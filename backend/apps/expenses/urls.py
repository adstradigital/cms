from django.urls import path
from . import views

urlpatterns = [
    path("categories/", views.category_list, name="expense-category-list"),
    path("categories/<int:pk>/", views.category_detail, name="expense-category-detail"),
    path("entries/", views.entry_list, name="expense-entry-list"),
    path("entries/<int:pk>/", views.entry_detail, name="expense-entry-detail"),
    path("entries/<int:pk>/approve/", views.approve_expense, name="expense-approve"),
]
