from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"racks", views.RackViewSet)
router.register(r"shelves", views.ShelfViewSet)
router.register(r"settings", views.LibrarySettingViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.library_dashboard_view, name="library-dashboard"),
    path("books/", views.book_list_view, name="book-list"),
    path("books/<int:pk>/", views.book_detail_view, name="book-detail"),
    path("books/bulk-upload/", views.book_bulk_upload_view, name="book-bulk-upload"),
    path("issues/", views.book_issue_list_view, name="book-issue-list"),
    path("issues/<int:pk>/return/", views.book_return_view, name="book-return"),
    path("issues/<int:pk>/pay/", views.mark_fine_paid_view, name="mark-fine-paid"),
    path("reports/", views.library_reports_view, name="library-reports"),
    path("reports/export/", views.library_reports_export_view, name="library-reports-export"),
]
