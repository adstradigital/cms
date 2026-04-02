from django.contrib import admin
from .models import HostelBlock, HostelRoom, HostelAllotment

admin.site.register(HostelBlock)
admin.site.register(HostelRoom)
admin.site.register(HostelAllotment)
