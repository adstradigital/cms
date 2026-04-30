"""
Chat URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rooms', views.ChatRoomViewSet, basename='chatroom')

urlpatterns = [
    path('', include(router.urls)),
    path('users/', views.chat_users, name='chat-users'),
    path('heartbeat/', views.heartbeat, name='chat-heartbeat'),
    path('online/', views.online_users, name='chat-online'),
    path('unread/', views.unread_total, name='chat-unread'),
]
