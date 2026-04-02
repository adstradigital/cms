from django.contrib import admin
from .models import TransportRoute, RouteStop, StudentTransport

admin.site.register(TransportRoute)
admin.site.register(RouteStop)
admin.site.register(StudentTransport)
