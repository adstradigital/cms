from django.contrib import admin

from .models import (
    BusLocationLog,
    RouteStop,
    SchoolBus,
    StudentTransport,
    TransportComplaint,
    TransportFee,
    TransportRoute,
)

admin.site.register(SchoolBus)
admin.site.register(TransportRoute)
admin.site.register(RouteStop)
admin.site.register(StudentTransport)
admin.site.register(BusLocationLog)
admin.site.register(TransportFee)
admin.site.register(TransportComplaint)
