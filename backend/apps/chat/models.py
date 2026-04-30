"""
Chat models — ChatRoom, Message, and UserPresence.
"""
from django.conf import settings
from django.db import models


class ChatRoom(models.Model):
    """Represents a direct or group chat room."""
    ROOM_DIRECT = 'direct'
    ROOM_GROUP = 'group'
    ROOM_TYPE_CHOICES = [
        (ROOM_DIRECT, 'Direct'),
        (ROOM_GROUP, 'Group'),
    ]

    name = models.CharField(max_length=150, blank=True)
    room_type = models.CharField(max_length=10, choices=ROOM_TYPE_CHOICES, default=ROOM_DIRECT)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chat_rooms', blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_rooms'
    )
    avatar = models.ImageField(upload_to='chat/room_avatars/', null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-updated_at']

    def __str__(self):
        return self.name or f"Room #{self.pk}"

    def get_last_message(self):
        return self.messages.order_by('-timestamp').first()

    def unread_count_for(self, user):
        return self.messages.exclude(read_by=user).exclude(sender=user).count()


class Message(models.Model):
    """A single chat message, optionally with a file attachment."""
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('academic', 'Academic'),
        ('photo', 'Photo'),
        ('file', 'File'),
    ]

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='chat/files/%Y/%m/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=50, blank=True)  # e.g. image/png, application/pdf
    file_size = models.PositiveIntegerField(default=0)  # bytes
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='read_messages', blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['timestamp']

    def __str__(self):
        preview = self.content[:40] if self.content else '[file]'
        return f"{self.sender} → {self.room}: {preview}"


class UserPresence(models.Model):
    """Tracks whether a user is online and when they were last seen."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='presence')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_user_presence'

    def __str__(self):
        status = 'online' if self.is_online else 'offline'
        return f"{self.user.username}: {status}"
