from django.contrib import admin
from .models import (
    Hostel, Floor, Room, RoomAllotment, RoomTransfer,
    NightAttendance, EntryExitLog, RuleViolation, VisitorLog, HostelFee,
    MessMenuPlan, MessMealAttendance, MessDietProfile, MessFeedback,
    MessInventoryItem, MessInventoryLog, MessVendor, MessVendorSupply,
    MessWastageLog, MessConsumptionLog
)

admin.site.register(Hostel)
admin.site.register(Floor)
admin.site.register(Room)
admin.site.register(RoomAllotment)
admin.site.register(RoomTransfer)
admin.site.register(NightAttendance)
admin.site.register(EntryExitLog)
admin.site.register(RuleViolation)
admin.site.register(VisitorLog)
admin.site.register(HostelFee)
admin.site.register(MessMenuPlan)
admin.site.register(MessMealAttendance)
admin.site.register(MessDietProfile)
admin.site.register(MessFeedback)
admin.site.register(MessInventoryItem)
admin.site.register(MessInventoryLog)
admin.site.register(MessVendor)
admin.site.register(MessVendorSupply)
admin.site.register(MessWastageLog)
admin.site.register(MessConsumptionLog)
