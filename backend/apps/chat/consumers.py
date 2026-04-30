import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if self.user.is_anonymous:
            await self.close()
            return

        # Personal group — receives notifications for ALL rooms this user is in
        self.user_group_name = f"user_chat_{self.user.id}"

        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        # Join the global "presence" group so every user gets online/offline events
        await self.channel_layer.group_add(
            "presence",
            self.channel_name
        )

        # Mark user online in the database
        await self.set_online_status(True)

        # Broadcast to everyone in the presence group
        await self.channel_layer.group_send("presence", {
            "type": "user.online",
            "user_id": self.user.id,
        })

        await self.accept()

    async def disconnect(self, close_code):
        if not self.user.is_anonymous:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            await self.channel_layer.group_discard(
                "presence",
                self.channel_name
            )

            # Mark user offline
            await self.set_online_status(False)
            await self.channel_layer.group_send("presence", {
                "type": "user.offline",
                "user_id": self.user.id,
            })

    async def receive(self, text_data):
        """Handle incoming WS messages (typing indicators, etc.)."""
        data = json.loads(text_data)
        action = data.get("action")

        if action == "typing":
            room_id = data.get("room_id")
            if room_id:
                await self.channel_layer.group_send(
                    f"chat_room_{room_id}",
                    {
                        "type": "typing.indicator",
                        "user_id": self.user.id,
                        "username": self.user.get_full_name() or self.user.username,
                    }
                )

    # ── Handler methods — called by group_send ──────────────

    async def chat_message(self, event):
        """New chat message notification."""
        await self.send(text_data=json.dumps(event))

    async def user_online(self, event):
        """A user came online."""
        await self.send(text_data=json.dumps({
            "type": "user.online",
            "user_id": event["user_id"],
        }))

    async def user_offline(self, event):
        """A user went offline."""
        await self.send(text_data=json.dumps({
            "type": "user.offline",
            "user_id": event["user_id"],
        }))

    async def chat_read(self, event):
        """A user marked messages in a room as read."""
        await self.send(text_data=json.dumps({
            "type": "chat.read",
            "room_id": event["room_id"],
            "user_id": event["user_id"],
        }))

    async def typing_indicator(self, event):
        """Typing indicator."""
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "username": event.get("username", ""),
        }))

    @database_sync_to_async
    def set_online_status(self, status):
        from .models import UserPresence
        presence, _ = UserPresence.objects.get_or_create(user=self.user)
        presence.is_online = status
        presence.save()
