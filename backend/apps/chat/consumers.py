import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
            
        # Group for user's own updates (e.g. they receive messages from ANY room they are in)
        self.user_group_name = f"user_chat_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        # Mark user online
        await self.set_online_status(True)
        await self.channel_layer.group_send("presence", {
            "type": "user.online", "user_id": self.user.id
        })

        await self.accept()

    async def disconnect(self, close_code):
        if not self.user.is_anonymous:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            # Mark user offline
            await self.set_online_status(False)
            await self.channel_layer.group_send("presence", {
                "type": "user.offline", "user_id": self.user.id
            })

    async def receive(self, text_data):
        # We handle REST API for sending messages, but WS can be used for typing indicators etc.
        data = json.loads(text_data)
        action = data.get("action")
        
        if action == "typing":
            room_id = data.get("room_id")
            # Broadcast typing event...
            pass
            
    async def chat_message(self, event):
        """Called when a message is sent to the group"""
        await self.send(text_data=json.dumps(event))

    async def user_online(self, event):
        await self.send(text_data=json.dumps(event))
        
    async def user_offline(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def set_online_status(self, status):
        from .models import UserPresence
        presence, _ = UserPresence.objects.get_or_create(user=self.user)
        presence.is_online = status
        presence.save()
