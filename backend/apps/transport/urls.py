from django.urls import path

from . import views

urlpatterns = [
    # School buses
    path("buses/", views.school_bus_list_view, name="school-bus-list"),
    path("buses/<int:pk>/", views.school_bus_detail_view, name="school-bus-detail"),
    path("buses/<int:bus_pk>/live-location/", views.school_bus_live_location_view, name="school-bus-live-location"),

    # Live location logs
    path("buses/ping/", views.bus_ping_view, name="bus-ping"),
    path("locations/", views.bus_location_log_list_view, name="bus-location-log-list"),

    # Routes and stops
    path("routes/", views.transport_route_list_view, name="transport-route-list"),
    path("routes/<int:pk>/", views.transport_route_detail_view, name="transport-route-detail"),
    path("routes/<int:route_pk>/stops/", views.route_stop_create_view, name="route-stop-list-create"),
    path("stops/<int:pk>/", views.route_stop_detail_view, name="route-stop-detail"),

    # Student transport allocations
    path("students/", views.student_transport_list_view, name="student-transport-list"),
    path("students/<int:pk>/", views.student_transport_detail_view, name="student-transport-detail"),

    # Student boarding/exiting logs
    path("student-logs/", views.student_transport_log_list_view, name="student-transport-log-list"),
    path("student-logs/bulk/", views.student_transport_log_bulk_upsert_view, name="student-transport-log-bulk"),
    path("student-logs/<int:pk>/", views.student_transport_log_detail_view, name="student-transport-log-detail"),

    # Transport fee management and payment
    path("fees/", views.transport_fee_list_view, name="transport-fee-list"),
    path("fees/<int:pk>/", views.transport_fee_detail_view, name="transport-fee-detail"),
    path("fees/<int:pk>/pay/", views.transport_fee_pay_view, name="transport-fee-pay"),

    # Complaints
    path("complaints/", views.transport_complaint_list_view, name="transport-complaint-list"),
    path("complaints/<int:pk>/", views.transport_complaint_detail_view, name="transport-complaint-detail"),

    # Analytics
    path("analytics/", views.transport_analytics_view, name="transport-analytics"),
]
