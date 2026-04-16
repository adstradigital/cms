from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'students', views.StudentViewSet, basename='students')
router.register(r'admission-inquiries', views.AdmissionInquiryViewSet, basename='admission-inquiries')

urlpatterns = [
    path("", include(router.urls)),
    path("classes/",                         views.class_list_view,              name="class-list"),
    path("classes/<int:pk>/",                views.class_detail_view,            name="class-detail"),
    path("sections/",                        views.section_list_view,            name="section-list"),
    path("sections/<int:pk>/",               views.section_detail_view,          name="section-detail"),
    
    # Nested Document URLs (can also be handled by router if needed, but keeping for compatibility)
    path("students/<int:student_pk>/documents/", views.StudentDocumentViewSet.as_view({'get': 'list', 'post': 'create'}), name="student-document-list"),
    path("students/documents/<int:pk>/",     views.StudentDocumentViewSet.as_view({'delete': 'destroy'}),   name="student-document-delete"),
]
