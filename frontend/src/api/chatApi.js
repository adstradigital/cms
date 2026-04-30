/**
 * Chat API — REST endpoints for the messaging system.
 */
import instance from './instance';

const BASE = '/chat';

const chatApi = {
  // ── Rooms ───────────────────────────────────────────────
  getRooms: (type) =>
    instance.get(`${BASE}/rooms/`, { params: type ? { type } : {} }),

  getRoom: (id) =>
    instance.get(`${BASE}/rooms/${id}/`),

  createRoom: (data) =>
    instance.post(`${BASE}/rooms/`, data),

  // ── Messages ────────────────────────────────────────────
  getMessages: (roomId, { before, limit = 50 } = {}) =>
    instance.get(`${BASE}/rooms/${roomId}/messages/`, {
      params: { before, limit },
    }),

  sendMessage: (roomId, content, category = 'general') =>
    instance.post(`${BASE}/rooms/${roomId}/send/`, { content, category }),

  uploadFile: (roomId, file, category = 'file', content = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (content) formData.append('content', content);
    return instance.post(`${BASE}/rooms/${roomId}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markRead: (roomId) =>
    instance.post(`${BASE}/rooms/${roomId}/mark_read/`),

  addMembers: (roomId, memberIds) =>
    instance.post(`${BASE}/rooms/${roomId}/add_members/`, { member_ids: memberIds }),

  // ── Users & Presence ────────────────────────────────────
  getUsers: (search = '') =>
    instance.get(`${BASE}/users/`, { params: search ? { search } : {} }),

  heartbeat: () =>
    instance.post(`${BASE}/heartbeat/`),

  getOnlineUsers: () =>
    instance.get(`${BASE}/online/`),

  getUnreadTotal: () =>
    instance.get(`${BASE}/unread/`),
};

export default chatApi;
