"""
Chat serializers — REST API representations.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, Message, UserPresence

User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    """Lightweight user representation for chat contexts."""
    full_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'photo', 'role_name', 'is_online', 'last_seen']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_photo(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile and profile.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.photo.url)
            return profile.photo.url
        return None

    def get_role_name(self, obj):
        return obj.role.name if obj.role else 'Staff'

    def get_is_online(self, obj):
        presence = getattr(obj, 'presence', None)
        return presence.is_online if presence else False

    def get_last_seen(self, obj):
        presence = getattr(obj, 'presence', None)
        return presence.last_seen if presence else None


class MessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    read_by_ids = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'room', 'sender', 'content', 'file_url', 'file_name',
            'file_type', 'file_size', 'category', 'read_by_ids', 'timestamp',
        ]
        read_only_fields = ['id', 'sender', 'timestamp']

    def get_read_by_ids(self, obj):
        return list(obj.read_by.values_list('id', flat=True))

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ChatRoomSerializer(serializers.ModelSerializer):
    members = ChatUserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_photo = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'members', 'description',
            'avatar', 'last_message', 'unread_count', 'display_name',
            'display_photo', 'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        msg = obj.get_last_message()
        if msg:
            return {
                'id': msg.id,
                'content': msg.content or f'[{msg.file_type or "file"}]',
                'sender_name': msg.sender.get_full_name() or msg.sender.username,
                'timestamp': msg.timestamp,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.unread_count_for(request.user)
        return 0

    def get_display_name(self, obj):
        """For direct chats, show the other person's name."""
        if obj.room_type == ChatRoom.ROOM_GROUP:
            return obj.name
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other = obj.members.exclude(id=request.user.id).first()
            if other:
                return other.get_full_name() or other.username
        return obj.name or 'Chat'

    def get_display_photo(self, obj):
        if obj.room_type == ChatRoom.ROOM_GROUP:
            if obj.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.avatar.url)
                return obj.avatar.url
            return None
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other = obj.members.exclude(id=request.user.id).first()
            if other:
                profile = getattr(other, 'profile', None)
                if profile and profile.photo:
                    return request.build_absolute_uri(profile.photo.url)
        return None


class ChatRoomCreateSerializer(serializers.Serializer):
    """Create a new chat room (direct or group)."""
    room_type = serializers.ChoiceField(choices=ChatRoom.ROOM_TYPE_CHOICES)
    name = serializers.CharField(max_length=150, required=False, default='')
    member_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    description = serializers.CharField(required=False, default='')

    def create(self, validated_data):
        user = self.context['request'].user
        room_type = validated_data['room_type']
        member_ids = validated_data['member_ids']

        # For direct chat, check if a room already exists
        if room_type == ChatRoom.ROOM_DIRECT and len(member_ids) == 1:
            other_id = member_ids[0]
            existing = ChatRoom.objects.filter(
                room_type=ChatRoom.ROOM_DIRECT,
                members=user,
            ).filter(members=other_id)
            # Make sure it's exactly 2 members
            for room in existing:
                if room.members.count() == 2:
                    return room

        room = ChatRoom.objects.create(
            name=validated_data.get('name', ''),
            room_type=room_type,
            created_by=user,
            description=validated_data.get('description', ''),
        )
        room.members.add(user)
        room.members.add(*User.objects.filter(id__in=member_ids))
        return room
