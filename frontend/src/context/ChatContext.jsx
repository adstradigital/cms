'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import chatApi from '@/api/chatApi';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [mainChatOpen, setMainChatOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [quickChatRoom, setQuickChatRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const heartbeatRef = useRef(null);
  const pollRef = useRef(null);
  const wsRef = useRef(null);

  // ── Fetch rooms ──────────────────────────────────────────
  const fetchRooms = useCallback(async (type) => {
    try {
      const res = await chatApi.getRooms(type);
      setRooms(res.data?.results || res.data || []);
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    }
  }, []);

  // ── Fetch messages for a room ────────────────────────────
  const fetchMessages = useCallback(async (roomId) => {
    try {
      setLoading(true);
      const res = await chatApi.getMessages(roomId);
      setMessages(res.data?.results || res.data || []);
      // Mark as read
      chatApi.markRead(roomId).catch(() => {});
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Send message ─────────────────────────────────────────
  const sendMessage = useCallback(async (roomId, content, category = 'general') => {
    try {
      const res = await chatApi.sendMessage(roomId, content, category);
      setMessages((prev) => [...prev, res.data]);
      // Refresh rooms to update last_message
      fetchRooms();
      return res.data;
    } catch (e) {
      console.error('Failed to send message:', e);
      throw e;
    }
  }, [fetchRooms]);

  // ── Upload file ──────────────────────────────────────────
  const uploadFile = useCallback(async (roomId, file, category = 'file', content = '') => {
    try {
      const res = await chatApi.uploadFile(roomId, file, category, content);
      setMessages((prev) => [...prev, res.data]);
      fetchRooms();
      return res.data;
    } catch (e) {
      console.error('Failed to upload file:', e);
      throw e;
    }
  }, [fetchRooms]);

  // ── Create room ──────────────────────────────────────────
  const createRoom = useCallback(async (roomData) => {
    try {
      const res = await chatApi.createRoom(roomData);
      await fetchRooms();
      return res.data;
    } catch (e) {
      console.error('Failed to create room:', e);
      throw e;
    }
  }, [fetchRooms]);

  // ── Open a direct chat with a user ───────────────────────
  const openDirectChat = useCallback(async (userId) => {
    try {
      const res = await chatApi.createRoom({
        room_type: 'direct',
        member_ids: [userId],
      });
      const room = res.data;
      setActiveRoom(room);
      await fetchMessages(room.id);
      return room;
    } catch (e) {
      console.error('Failed to open direct chat:', e);
      throw e;
    }
  }, [fetchMessages]);

  // ── Fetch available users ────────────────────────────────
  const fetchChatUsers = useCallback(async (search = '') => {
    try {
      const res = await chatApi.getUsers(search);
      setChatUsers(res.data?.results || res.data || []);
    } catch (e) {
      console.error('Failed to fetch chat users:', e);
    }
  }, []);

  // ── Fetch online status ──────────────────────────────────
  const fetchOnlineStatus = useCallback(async () => {
    try {
      const res = await chatApi.getOnlineUsers();
      setOnlineUserIds(res.data?.online_user_ids || []);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Fetch unread total ───────────────────────────────────
  const fetchUnreadTotal = useCallback(async () => {
    try {
      const res = await chatApi.getUnreadTotal();
      setUnreadTotal(res.data?.unread_total || 0);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Select a room ────────────────────────────────────────
  const selectRoom = useCallback((room) => {
    setActiveRoom(room);
    if (room) fetchMessages(room.id);
  }, [fetchMessages]);

  // Keep a ref so the WS handler always sees the latest activeRoom
  const activeRoomRef = useRef(null);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // ── Heartbeat & polling ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchRooms();
    fetchChatUsers();
    fetchOnlineStatus();
    fetchUnreadTotal();

    // Heartbeat every 60s
    chatApi.heartbeat().catch(() => {});
    heartbeatRef.current = setInterval(() => {
      chatApi.heartbeat().catch(() => {});
    }, 60000);

    // WebSocket connection logic with auto-reconnect
    let reconnectTimer = null;
    const connectWS = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/chat/?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Chat WS] connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'user.online') {
            setOnlineUserIds((prev) => {
              if (!prev.includes(data.user_id)) return [...prev, data.user_id];
              return prev;
            });
          } else if (data.type === 'user.offline') {
            setOnlineUserIds((prev) => prev.filter((id) => id !== data.user_id));
          } else if (data.type === 'chat.read') {
            const currentRoom = activeRoomRef.current;
            if (currentRoom && data.room_id === currentRoom.id) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.sender?.id !== data.user_id && !m.read_by_ids?.includes(data.user_id)) {
                    return { ...m, read_by_ids: [...(m.read_by_ids || []), data.user_id] };
                  }
                  return m;
                })
              );
            }
          } else if (data.type === 'chat.message') {
            const currentRoom = activeRoomRef.current;
            const isForActiveRoom = currentRoom && data.room_id === currentRoom.id;

            if (isForActiveRoom) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.message?.id)) return prev;
                return [...prev, data.message];
              });
              
              chatApi.markRead(currentRoom.id).then(() => {
                setTimeout(() => {
                  fetchUnreadTotal();
                  fetchRooms();
                }, 200);
              }).catch(() => {});
            } else {
              fetchUnreadTotal();
              fetchRooms();
            }
          }
        } catch (e) {
          console.error('[Chat WS] parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Chat WS] disconnected, reconnecting in 3s...');
        reconnectTimer = setTimeout(connectWS, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('[Chat WS] error:', err);
        ws.close();
      };
    };

    connectWS();

    // Poll for updates every 5s (fallback for WS)
    pollRef.current = setInterval(() => {
      fetchOnlineStatus();
      fetchUnreadTotal();
      fetchRooms();
      const currentRoom = activeRoomRef.current;
      if (currentRoom) {
        chatApi.getMessages(currentRoom.id).then((res) => {
          setMessages(res.data?.results || res.data || []);
        }).catch(() => {});
      }
    }, 5000);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(pollRef.current);
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent auto-reconnect from firing during cleanup
        wsRef.current.close();
      }
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleOpenMainChat = () => setMainChatOpen(true);
    window.addEventListener('open-main-chat', handleOpenMainChat);
    return () => window.removeEventListener('open-main-chat', handleOpenMainChat);
  }, []);

  const value = {
    rooms,
    activeRoom,
    messages,
    chatUsers,
    onlineUserIds,
    unreadTotal,
    mainChatOpen,
    quickChatOpen,
    quickChatRoom,
    loading,
    fetchRooms,
    fetchMessages,
    sendMessage,
    uploadFile,
    createRoom,
    openDirectChat,
    fetchChatUsers,
    selectRoom,
    setMainChatOpen,
    setQuickChatOpen,
    setQuickChatRoom,
    fetchUnreadTotal,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
