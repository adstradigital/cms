'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, ChevronUp, Minus, X, Search, ArrowRight,
  Send, Paperclip, ChevronLeft, Image as ImageIcon, FileText
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import styles from './QuickChat.module.css';

const QuickChat = () => {
  const { user } = useAuth();
  const {
    rooms, activeRoom, messages, chatUsers, onlineUserIds, unreadTotal,
    fetchRooms, sendMessage, uploadFile, selectRoom, openDirectChat,
    fetchChatUsers, setMainChatOpen,
  } = useChat();

  const [isExpanded, setIsExpanded] = useState(false);
  const [view, setView] = useState('list'); // list | chat
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [positionX, setPositionX] = useState(60);
  const currentPosRef = useRef(60);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, startPos: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const savedX = localStorage.getItem('quickChatPosX');
    if (savedX !== null) {
      const parsed = parseInt(savedX, 10);
      setPositionX(parsed);
      currentPosRef.current = parsed;
    }
  }, []);

  const handlePointerDown = (e) => {
    // Prevent drag if clicking on action buttons inside the expanded header
    if (e.target.closest(`.${styles.headerActions}`)) return;
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, startPos: currentPosRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    if (Math.abs(dx) > 3) hasMoved.current = true;
    
    // Moving right (dx > 0) decreases right offset. Moving left (dx < 0) increases it.
    const newPos = Math.max(0, Math.min(window.innerWidth - 100, dragStart.current.startPos - dx));
    setPositionX(newPos);
    currentPosRef.current = newPos;
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (hasMoved.current) {
      localStorage.setItem('quickChatPosX', currentPosRef.current.toString());
    }
  };

  const toggleExpand = () => {
    if (!hasMoved.current) setIsExpanded(true);
  };

  useEffect(() => {
    if (isExpanded && rooms.length === 0) fetchRooms();
    if (isExpanded && chatUsers.length === 0) fetchChatUsers();
  }, [isExpanded]); // eslint-disable-line

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  const handleSend = async () => {
    if (!inputValue.trim() || !activeRoom) return;
    const text = inputValue;
    setInputValue('');
    await sendMessage(activeRoom.id, text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    const cat = file.type?.startsWith('image/') ? 'photo' : 'file';
    await uploadFile(activeRoom.id, file, cat);
    e.target.value = '';
  };

  const openChat = (room) => {
    selectRoom(room);
    setView('chat');
  };

  const startDirectChat = async (u) => {
    await openDirectChat(u.id);
    setView('chat');
  };

  const goBack = () => {
    setView('list');
    selectRoom(null);
  };

  const openFullChat = () => {
    setIsExpanded(false);
    setMainChatOpen(true);
  };

  const isOnline = (userId) => onlineUserIds.includes(userId);

  // Grouping logic for "ONLINE" and "RECENT"
  // "RECENT" = existing rooms that match search
  const filteredRooms = rooms.filter((r) =>
    r.display_name?.toLowerCase().includes(searchValue.toLowerCase())
  );

  // "ONLINE" = chatUsers who are online and match search
  const onlineUsers = chatUsers.filter((u) => 
    isOnline(u.id) && (u.full_name || u.username).toLowerCase().includes(searchValue.toLowerCase())
  );

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className={styles.dockedWrapper} style={{ right: `${positionX}px` }}>
      {!isExpanded ? (
        <button 
          className={`${styles.collapsedBtn} ${isDragging ? styles.dragging : ''}`} 
          onClick={toggleExpand}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag to move horizontally"
        >
          <div className={styles.collapsedIconWrapper}>
            <MessageSquare size={18} />
            {unreadTotal > 0 && <span className={styles.badge}>{unreadTotal}</span>}
          </div>
          <span className={styles.collapsedText}>Quick Chat</span>
          <ChevronUp size={18} className={styles.collapsedChevron} />
        </button>
      ) : (
        <div className={styles.expandedPanel}>
          {/* Header */}
          <div 
            className={`${styles.panelHeader} ${isDragging ? styles.dragging : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title="Drag to move horizontally"
          >
            <span className={styles.headerTitle}>
              {view === 'chat' && activeRoom ? activeRoom.display_name : 'Quick Chat'}
            </span>
            <div className={styles.headerActions}>
              <button onClick={() => setIsExpanded(false)}><Minus size={16} /></button>
              <button onClick={() => setIsExpanded(false)}><X size={16} /></button>
            </div>
          </div>

          {/* Body */}
          {view === 'list' ? (
            <div className={styles.listBody}>
              <div className={styles.searchContainer}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.listContainer}>
                {onlineUsers.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>ONLINE</div>
                    {onlineUsers.map((u) => (
                      <button key={u.id} className={styles.listItem} onClick={() => startDirectChat(u)}>
                        <div className={styles.avatarWrapper}>
                          {u.photo ? <img src={u.photo} alt="" /> : <div className={styles.avatarFallback}>{(u.full_name || u.username)?.[0]?.toUpperCase()}</div>}
                          <span className={`${styles.statusDot} ${styles.statusOnline}`} />
                        </div>
                        <div className={styles.listInfo}>
                          <span className={styles.listName}>{u.full_name || u.username}</span>
                          <span className={styles.listRole}>{u.role_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>RECENT</div>
                  {filteredRooms.length === 0 ? (
                    <div className={styles.emptyState}>No recent conversations</div>
                  ) : (
                    filteredRooms.map((room) => {
                      const isRoomOnline = room.room_type === 'direct' && room.members?.some(m => m.id !== user?.id && isOnline(m.id));
                      return (
                        <button key={room.id} className={styles.listItem} onClick={() => openChat(room)}>
                          <div className={styles.avatarWrapper}>
                            {room.display_photo ? <img src={room.display_photo} alt="" /> : <div className={styles.avatarFallback}>{room.display_name?.[0]?.toUpperCase()}</div>}
                            <span className={`${styles.statusDot} ${isRoomOnline ? styles.statusOnline : styles.statusOffline}`} />
                          </div>
                          <div className={styles.listInfo}>
                            <span className={styles.listName}>{room.display_name}</span>
                            <span className={styles.listRole}>{room.room_type === 'group' ? `${room.members?.length} members` : room.members?.find(m => m.id !== user?.id)?.role_name || 'Staff'}</span>
                          </div>
                          {room.unread_count > 0 && <span className={styles.unreadCount}>{room.unread_count}</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={styles.panelFooter}>
                <button className={styles.viewAllBtn} onClick={openFullChat}>
                  View All Messages <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.chatBody}>
              <div className={styles.chatSubHeader}>
                 <button className={styles.backBtn} onClick={goBack}><ChevronLeft size={16} /></button>
                 <span className={styles.chatSubTitle}>
                    {activeRoom?.room_type === 'direct' && activeRoom?.members?.some(m => m.id !== user?.id && isOnline(m.id)) ? 'Active Now' : 'Offline'}
                 </span>
              </div>
              <div className={styles.messagesArea}>
                {messages.map((msg) => {
                  const isMe = msg.sender?.id === user?.id;
                  const isImage = msg.file_type?.startsWith('image/');
                  return (
                    <div key={msg.id} className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''}`}>
                      <div className={`${styles.msgBubble} ${isMe ? styles.msgBubbleMe : ''}`}>
                        {msg.file_url && isImage && <img src={msg.file_url} alt="" className={styles.msgImage} />}
                        {msg.file_url && !isImage && (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                            <FileText size={14} /> <span>{msg.file_name || 'Download'}</span>
                          </a>
                        )}
                        {msg.content && <p className={styles.msgText}>{msg.content}</p>}
                        <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className={styles.inputArea}>
                <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()}><Paperclip size={16} /></button>
                <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={styles.msgInput}
                />
                <button className={styles.sendBtn} onClick={handleSend} disabled={!inputValue.trim()}><Send size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickChat;
