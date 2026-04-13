from django.urls import path
from . import views

urlpatterns = [
    # Hostels
    path("", views.hostel_list_view, name="hostel-list"),
    path("<int:pk>/", views.hostel_detail_view, name="hostel-detail"),

    # Floors
    path("floors/", views.floor_list_view, name="hostel-floor-list"),
    path("floors/<int:pk>/", views.floor_detail_view, name="hostel-floor-detail"),

    # Rooms
    path("rooms/", views.room_list_view, name="hostel-room-list"),
    path("rooms/<int:pk>/", views.room_detail_view, name="hostel-room-detail"),

    # Allotments
    path("allotments/", views.allotment_list_view, name="hostel-allotment-list"),
    path("allotments/<int:pk>/", views.allotment_detail_view, name="hostel-allotment-detail"),
    path("allotments/<int:pk>/vacate/", views.vacate_view, name="hostel-vacate"),
    path("allotments/auto-assign/", views.auto_assign_view, name="hostel-auto-assign"),

    # Transfers
    path("transfers/", views.transfer_list_view, name="hostel-transfer-list"),

    # Night Attendance
    path("night-attendance/", views.night_attendance_list_view, name="hostel-attendance-list"),

    # Entry/Exit
    path("entry-exit/", views.entry_exit_list_view, name="hostel-entry-exit-list"),

    # Rule Violations
    path("violations/", views.violation_list_view, name="hostel-violation-list"),
    path("violations/<int:pk>/", views.violation_detail_view, name="hostel-violation-detail"),

    # Visitors
    path("visitors/", views.visitor_list_view, name="hostel-visitor-list"),
    path("visitors/<int:pk>/", views.visitor_detail_view, name="hostel-visitor-detail"),
    path("visitors/<int:pk>/approve/", views.visitor_approve_view, name="hostel-visitor-approve"),
    path("visitors/<int:pk>/checkout/", views.visitor_checkout_view, name="hostel-visitor-checkout"),

    # Fees
    path("fees/", views.hostel_fee_list_view, name="hostel-fee-list"),
    path("fees/<int:pk>/pay/", views.hostel_fee_pay_view, name="hostel-fee-pay"),

    # Mess
    path("mess/menus/", views.mess_menu_list_view, name="mess-menu-list"),
    path("mess/menus/<int:pk>/", views.mess_menu_detail_view, name="mess-menu-detail"),
    path("mess/menus/bulk/", views.mess_menu_bulk_upsert_view, name="mess-menu-bulk"),
    path("mess/attendance/", views.mess_attendance_list_view, name="mess-attendance-list"),
    path("mess/diet-profiles/", views.mess_diet_profile_list_view, name="mess-diet-profile-list"),
    path("mess/feedback/", views.mess_feedback_list_view, name="mess-feedback-list"),
    path("mess/feedback/<int:pk>/", views.mess_feedback_detail_view, name="mess-feedback-detail"),
    path("mess/inventory/items/", views.mess_inventory_item_list_view, name="mess-inventory-item-list"),
    path("mess/inventory/logs/", views.mess_inventory_log_list_view, name="mess-inventory-log-list"),
    path("mess/vendors/", views.mess_vendor_list_view, name="mess-vendor-list"),
    path("mess/vendor-supplies/", views.mess_vendor_supply_list_view, name="mess-vendor-supply-list"),
    path("mess/vendor-supplies/<int:pk>/", views.mess_vendor_supply_detail_view, name="mess-vendor-supply-detail"),
    path("mess/wastage/", views.mess_wastage_list_view, name="mess-wastage-list"),
    path("mess/wastage/<int:pk>/", views.mess_wastage_detail_view, name="mess-wastage-detail"),
    path("mess/consumption/", views.mess_consumption_list_view, name="mess-consumption-list"),
    path("mess/consumption/<int:pk>/", views.mess_consumption_detail_view, name="mess-consumption-detail"),
    path("mess/orders/", views.mess_food_order_list_view, name="mess-order-list"),
    path("mess/orders/<int:pk>/", views.mess_food_order_detail_view, name="mess-order-detail"),
    path("mess/student-costs/", views.mess_student_cost_view, name="mess-student-cost"),
    path("mess/analytics/", views.mess_analytics_view, name="mess-analytics"),

    # Analytics
    path("analytics/", views.hostel_analytics_view, name="hostel-analytics"),
]
