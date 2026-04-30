"""
Chat REST API views.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from django.db.models import Q, Max
from django.utils import timezone

from .models import ChatRoom, Message, UserPresence
from .serializers import (
    ChatRoomSerializer, ChatRoomCreateSerializer,
    MessageSerializer, ChatUserSerializer,
)

User = get_user_model()


class ChatRoomViewSet(viewsets.ModelViewSet):
    """CRUD for chat rooms the authenticated user belongs to."""
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ChatRoom.objects.filter(members=self.request.user)
        room_type = self.request.query_params.get('type')
        if room_type in ('direct', 'group'):
            qs = qs.filter(room_type=room_type)
        # Annotate with last message time for ordering
        qs = qs.annotate(last_msg_time=Max('messages__timestamp')).order_by(
            '-last_msg_time', '-updated_at'
        )
        return qs.distinct()

    def create(self, request, *args, **kwargs):
        serializer = ChatRoomCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(
            ChatRoomSerializer(room, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get paginated messages for a room."""
        room = self.get_object()
        messages = room.messages.select_related('sender', 'sender__profile', 'sender__role').all()

        # Simple cursor pagination via ?before=<message_id>
        before = request.query_params.get('before')
        if before:
            messages = messages.filter(id__lt=int(before))

        limit = min(int(request.query_params.get('limit', 50)), 100)
        messages = messages.order_by('-timestamp')[:limit]

        serializer = MessageSerializer(
            reversed(list(messages)), many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send a text message to a room."""
        room = self.get_object()
        content = request.data.get('content', '').strip()
        category = request.data.get('category', 'general')

        if not content:
            return Response({'error': 'Message content is required.'}, status=400)

        msg = Message.objects.create(
            room=room, sender=request.user,
            content=content, category=category,
        )
        msg.read_by.add(request.user)
        room.updated_at = timezone.now()
        room.save(update_fields=['updated_at'])

        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request, pk=None):
        """Upload a file message to a room."""
        room = self.get_object()
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'No file provided.'}, status=400)

        category = request.data.get('category', 'file')
        content = request.data.get('content', '')

        msg = Message.objects.create(
            room=room, sender=request.user,
            content=content, file=uploaded,
            file_name=uploaded.name,
            file_type=uploaded.content_type or '',
            file_size=uploaded.size,
            category=category,
        )
        msg.read_by.add(request.user)
        room.updated_at = timezone.now()
        room.save(update_fields=['updated_at'])

        return Response(MessageSerializer(msg, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in this room as read by the current user."""
        room = self.get_object()
        unread = room.messages.exclude(read_by=request.user).exclude(sender=request.user)
        for msg in unread:
            msg.read_by.add(request.user)
        return Response({'marked': unread.count()})

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        """Add members to a group chat."""
        room = self.get_object()
        if room.room_type != ChatRoom.ROOM_GROUP:
            return Response({'error': 'Can only add members to group chats.'}, status=400)
        member_ids = request.data.get('member_ids', [])
        users = User.objects.filter(id__in=member_ids)
        room.members.add(*users)
        return Response(ChatRoomSerializer(room, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def chat_users(request):
    """List all staff/admin users available for chat (excludes students/parents for now)."""
    users = User.objects.filter(
        Q(portal='admin') & Q(is_active=True)
    ).exclude(id=request.user.id).select_related('role', 'profile', 'presence').order_by('first_name', 'last_name')

    search = request.query_params.get('search', '').strip()
    if search:
        users = users.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(username__icontains=search)
        )

    serializer = ChatUserSerializer(users, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def heartbeat(request):
    """Ping to mark user as online. Called every 60s from frontend."""
    presence, _ = UserPresence.objects.get_or_create(user=request.user)
    presence.is_online = True
    presence.save()
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def online_users(request):
    """Get list of currently online user IDs."""
    # Users who pinged in the last 2 minutes are considered online
    cutoff = timezone.now() - timezone.timedelta(minutes=2)
    online_ids = list(
        UserPresence.objects.filter(is_online=True, last_seen__gte=cutoff)
        .values_list('user_id', flat=True)
    )
    return Response({'online_user_ids': online_ids})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_total(request):
    """Get total unread message count across all rooms for badge display."""
    rooms = ChatRoom.objects.filter(members=request.user)
    total = 0
    for room in rooms:
        total += room.unread_count_for(request.user)
    return Response({'unread_total': total})
