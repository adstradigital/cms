from django.urls import path
from . import views

urlpatterns = [
    path('meta/',           views.report_meta,          name='report-meta'),
    path('run/',            views.run_report_view,       name='report-run'),
    path('export/excel/',   views.export_excel,          name='report-export-excel'),
    path('export/pdf/',     views.export_pdf,            name='report-export-pdf'),
    path('saved/',          views.saved_reports,         name='saved-reports'),
    path('saved/<int:pk>/', views.saved_report_detail,   name='saved-report-detail'),
]
