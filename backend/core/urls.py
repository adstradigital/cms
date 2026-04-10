"""
Core URL Configuration — Campus Management System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def api_root(request):
    """API root endpoint — health check."""
    return Response({
        'status': 'ok',
        'message': 'Campus Management System API',
        'version': '1.0.0',
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # API root
    path('api/', api_root, name='api-root'),

    # DRF browsable API auth
    path('api-auth/', include('rest_framework.urls')),

    # App URLs
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/academics/', include('apps.academics.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/exams/', include('apps.exams.urls')),
    path('api/fees/', include('apps.fees.urls')),
    path('api/library/', include('apps.library.urls')),
    path('api/hostel/', include('apps.hostel.urls')),
    path('api/transport/', include('apps.transport.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/permissions/', include('apps.permissions.urls')),
    path('api/staff/', include('apps.staff.urls')),
    path('api/elections/', include('apps.elections.urls')),
    path('api/events/', include('apps.events.urls')),
    path('api/timetables/', include('apps.academics.urls_timetable')),
    path('api/canteen/', include('apps.canteen.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
