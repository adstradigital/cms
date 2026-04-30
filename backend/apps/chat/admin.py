from django.contrib import admin
from .models import ChatRoom, Message, UserPresence


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'room_type', 'created_at')
    list_filter = ('room_type',)
    search_fields = ('name',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'sender', 'category', 'timestamp')
    list_filter = ('category',)
    search_fields = ('content',)


@admin.register(UserPresence)
class UserPresenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_online', 'last_seen')
    list_filter = ('is_online',)
