'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, Search, Paperclip, Phone, MoreHorizontal,
  Users, UserPlus, Plus, FileText, Image as ImageIcon,
  GraduationCap, Smile, ChevronDown, Hash, Lock,
  Download, CheckCheck, Clock, ArrowLeft,
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import styles from './ChatWindow.module.css';

const ATTACH_OPTIONS = [
  { id: 'file', label: 'File', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip' },
  { id: 'photo', label: 'Photo', icon: ImageIcon, accept: 'image/*' },
  { id: 'academic', label: 'Academic', icon: GraduationCap, accept: '.pdf,.doc,.docx,.xls,.xlsx' },
];

const StaffChatOverlay = () => {
  const { user } = useAuth();
  const {
    rooms, activeRoom, messages, chatUsers, onlineUserIds, unreadTotal,
    mainChatOpen, setMainChatOpen,
    fetchRooms, sendMessage, uploadFile, selectRoom, openDirectChat,
    fetchChatUsers, createRoom, loading,
  } = useChat();

  const [chatTab, setChatTab] = useState('direct'); // direct | groups
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [mobileView, setMobileView] = useState('sidebar'); // sidebar | chat | info
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileCategory = useRef('file');

  useEffect(() => {
    if (mainChatOpen) {
      fetchRooms();
      fetchChatUsers();
    }
  }, [mainChatOpen]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setMainChatOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setMainChatOpen]);

  const isOnline = (userId) => onlineUserIds.includes(userId);

  const filteredRooms = rooms.filter((r) => {
    const matchType = chatTab === 'direct' ? r.room_type === 'direct' : r.room_type === 'group';
    const matchSearch = r.display_name?.toLowerCase().includes(searchValue.toLowerCase());
    return matchType && matchSearch;
  });

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatFullTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const handleAttachClick = (opt) => {
    fileCategory.current = opt.id;
    fileInputRef.current.accept = opt.accept;
    fileInputRef.current.click();
    setShowAttach(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    await uploadFile(activeRoom.id, file, fileCategory.current);
    e.target.value = '';
  };

  const openRoom = (room) => {
    selectRoom(room);
    setMobileView('chat');
  };

  const startDirect = async (u) => {
    await openDirectChat(u.id);
    setMobileView('chat');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    await createRoom({
      room_type: 'group',
      name: newGroupName,
      member_ids: newGroupMembers,
    });
    setShowNewGroup(false);
    setNewGroupName('');
    setNewGroupMembers([]);
  };

  const toggleGroupMember = (userId) => {
    setNewGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Shared files for info panel
  const sharedFiles = messages.filter((m) => m.file_url);

  // Active members categorization
  const onlineMembers = (activeRoom?.members || []).filter((m) => m.id !== user?.id && isOnline(m.id));
  const offlineMembers = (activeRoom?.members || []).filter((m) => m.id !== user?.id && !isOnline(m.id));

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.timestamp).toLocaleDateString([], {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  if (!mainChatOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.overlayBackdrop} onClick={() => setMainChatOpen(false)} />

      <div className={styles.chatContainer}>
        {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
        <div className={`${styles.sidebar} ${mobileView === 'sidebar' ? styles.sidebarMobileActive : ''}`}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Staff Chat</h2>
            <button className={styles.closeOverlayBtn} onClick={() => setMainChatOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Tab Toggle */}
          <div className={styles.chatTabRow}>
            <button
              className={`${styles.chatTabBtn} ${chatTab === 'direct' ? styles.chatTabActive : ''}`}
              onClick={() => setChatTab('direct')}
            >
              Direct
            </button>
            <button
              className={`${styles.chatTabBtn} ${chatTab === 'groups' ? styles.chatTabActive : ''}`}
              onClick={() => setChatTab('groups')}
            >
              Groups
            </button>
          </div>

          {/* Search */}
          <div className={styles.sidebarSearch}>
            <Search size={14} className={styles.sidebarSearchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={styles.sidebarSearchInput}
            />
          </div>

          {/* User sections */}
          <div className={styles.sidebarList}>
            {chatTab === 'direct' ? (
              <>
                {/* Online contacts who have rooms */}
                {filteredRooms.length > 0 && (
                  <>
                    <div className={styles.sectionLabel}>CONVERSATIONS</div>
                    {filteredRooms.map((room) => {
                      const otherMember = room.members?.find((m) => m.id !== user?.id);
                      const online = otherMember ? isOnline(otherMember.id) : false;
                      return (
                        <button
                          key={room.id}
                          className={`${styles.userItem} ${activeRoom?.id === room.id ? styles.userItemActive : ''}`}
                          onClick={() => openRoom(room)}
                        >
                          <div className={styles.userAvatar}>
                            {room.display_photo ? (
                              <img src={room.display_photo} alt="" />
                            ) : (
                              <div className={styles.avatarFallback}>
                                {room.display_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className={`${styles.presenceDot} ${online ? styles.presenceOnline : ''}`} />
                          </div>
                          <div className={styles.userMeta}>
                            <span className={styles.userName}>{room.display_name}</span>
                            <span className={styles.userRole}>{otherMember?.role_name || ''}</span>
                          </div>
                          {room.unread_count > 0 && (
                            <span className={styles.unreadPill}>{room.unread_count}</span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Available contacts (not yet chatted) */}
                <div className={styles.sectionLabel}>ALL STAFF</div>
                {chatUsers.filter((u) =>
                  (u.full_name || u.username).toLowerCase().includes(searchValue.toLowerCase())
                ).map((u) => (
                  <button
                    key={u.id}
                    className={styles.userItem}
                    onClick={() => startDirect(u)}
                  >
                    <div className={styles.userAvatar}>
                      {u.photo ? (
                        <img src={u.photo} alt="" />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {(u.full_name || u.username)?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className={`${styles.presenceDot} ${isOnline(u.id) ? styles.presenceOnline : ''}`} />
                    </div>
                    <div className={styles.userMeta}>
                      <span className={styles.userName}>{u.full_name || u.username}</span>
                      <span className={styles.userRole}>{u.role_name}</span>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <>
                <div className={styles.sectionLabel}>GROUPS</div>
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`${styles.userItem} ${activeRoom?.id === room.id ? styles.userItemActive : ''}`}
                    onClick={() => openRoom(room)}
                  >
                    <div className={styles.userAvatar}>
                      <div className={styles.groupAvatar}>
                        <Users size={16} />
                      </div>
                    </div>
                    <div className={styles.userMeta}>
                      <span className={styles.userName}>{room.display_name}</span>
                      <span className={styles.userRole}>{room.members?.length || 0} members</span>
                    </div>
                    {room.unread_count > 0 && (
                      <span className={styles.unreadPill}>{room.unread_count}</span>
                    )}
                  </button>
                ))}

                <button className={styles.newGroupBtn} onClick={() => setShowNewGroup(true)}>
                  <Plus size={16} />
                  <span>New Group</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: MESSAGE AREA ─────────────────────────── */}
        <div className={`${styles.chatMain} ${mobileView === 'chat' ? styles.chatMainMobileActive : ''}`}>
          {activeRoom ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <button className={styles.mobileBackBtn} onClick={() => setMobileView('sidebar')}>
                  <ArrowLeft size={18} />
                </button>
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatHeaderAvatar}>
                    {activeRoom.display_photo ? (
                      <img src={activeRoom.display_photo} alt="" />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {activeRoom.room_type === 'group'
                          ? <Users size={18} />
                          : activeRoom.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {activeRoom.room_type === 'direct' && (
                      <span className={`${styles.presenceDot} ${styles.headerPresence} ${
                        activeRoom.members?.some(m => m.id !== user?.id && isOnline(m.id))
                          ? styles.presenceOnline : ''
                      }`} />
                    )}
                  </div>
                  <div className={styles.chatHeaderText}>
                    <span className={styles.chatHeaderName}>{activeRoom.display_name}</span>
                    <span className={styles.chatHeaderSub}>
                      {activeRoom.room_type === 'group'
                        ? `${activeRoom.members?.length || 0} members`
                        : activeRoom.members?.some(m => m.id !== user?.id && isOnline(m.id))
                          ? '● Active now'
                          : (() => {
                              const other = activeRoom.members?.find(m => m.id !== user?.id);
                              return other?.role_name || 'Offline';
                            })()
                      }
                    </span>
                  </div>
                </div>
                <div className={styles.chatHeaderActions}>
                  <button className={styles.chatHeaderBtn} title="Voice Call">
                    <Phone size={17} />
                  </button>
                  <button
                    className={styles.chatHeaderBtn}
                    onClick={() => setMobileView(mobileView === 'info' ? 'chat' : 'info')}
                    title="Info"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className={styles.messagesContainer}>
                {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className={styles.dateDivider}>
                      <span>{dateKey === new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) ? 'Today' : dateKey}</span>
                    </div>
                    {msgs.map((msg) => {
                      const isMe = msg.sender?.id === user?.id;
                      const isImage = msg.file_type?.startsWith('image/');
                      const isDoc = msg.file_url && !isImage;
                      return (
                        <div key={msg.id} className={`${styles.messageRow} ${isMe ? styles.messageRowMe : ''}`}>
                          {!isMe && (
                            <div className={styles.msgAvatar}>
                              {msg.sender?.photo ? (
                                <img src={msg.sender.photo} alt="" />
                              ) : (
                                <span className={styles.msgAvatarFallback}>
                                  {msg.sender?.full_name?.[0]?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={`${styles.messageBubble} ${isMe ? styles.messageBubbleMe : ''}`}>
                            {!isMe && activeRoom.room_type === 'group' && (
                              <span className={styles.senderLabel}>{msg.sender?.full_name}</span>
                            )}
                            {isImage && (
                              <img src={msg.file_url} alt="" className={styles.msgImageFull} />
                            )}
                            {isDoc && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.docAttachment}
                              >
                                <div className={styles.docIcon}>
                                  <FileText size={18} />
                                </div>
                                <div className={styles.docMeta}>
                                  <span className={styles.docName}>{msg.file_name || 'Document'}</span>
                                  <span className={styles.docSize}>
                                    {formatSize(msg.file_size)} · {msg.file_type?.split('/')?.pop()?.toUpperCase() || 'FILE'}
                                  </span>
                                </div>
                                <Download size={16} className={styles.docDownload} />
                              </a>
                            )}
                            {msg.content && (
                              <p className={styles.msgContent}>{msg.content}</p>
                            )}
                            <div className={styles.msgMeta}>
                              <span className={styles.msgTimestamp}>{formatFullTime(msg.timestamp)}</span>
                              {isMe && (
                                <span className={styles.readReceipt}>
                                  <CheckCheck size={13} className={
                                    msg.read_by_ids?.length > 1 ? styles.readReceiptSeen : ''
                                  } />
                                </span>
                              )}
                            </div>
                          </div>
                          {isMe && <div className={styles.msgAvatarSpacer} />}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Bar */}
              <div className={styles.attachBar}>
                {ATTACH_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      className={styles.attachOption}
                      onClick={() => handleAttachClick(opt)}
                    >
                      <Icon size={18} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
                <button className={styles.attachOption}>
                  <Smile size={18} />
                  <span>Emoji</span>
                </button>
              </div>

              {/* Input Bar */}
              <div className={styles.inputBar}>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                />
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={styles.chatInput}
                />
                <button
                  className={styles.chatSendBtn}
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <div className={styles.noChatIcon}>
                <Users size={48} />
              </div>
              <h3>Select a conversation</h3>
              <p>Choose a contact or group from the sidebar to start messaging</p>
            </div>
          )}
        </div>

        {/* ── RIGHT INFO PANEL ─────────────────────────────── */}
        {activeRoom && (
          <div className={`${styles.infoPanel} ${mobileView === 'info' ? styles.infoPanelMobileActive : ''}`}>
            <div className={styles.infoPanelHeader}>
              <button className={styles.mobileBackBtn} onClick={() => setMobileView('chat')}>
                <ArrowLeft size={18} />
              </button>
              <span>Details</span>
            </div>

            {/* Shared Files */}
            <div className={styles.infoSection}>
              <div className={styles.infoSectionHeader}>
                <span>SHARED FILES</span>
                <MoreHorizontal size={14} />
              </div>
              <div className={styles.sharedFilesList}>
                {sharedFiles.length === 0 ? (
                  <div className={styles.infoEmpty}>No shared files yet</div>
                ) : (
                  sharedFiles.slice(-5).reverse().map((msg) => (
                    <a
                      key={msg.id}
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sharedFileItem}
                    >
                      <div className={styles.sharedFileIcon}>
                        {msg.file_type?.startsWith('image/') ? (
                          <ImageIcon size={16} />
                        ) : (
                          <FileText size={16} />
                        )}
                      </div>
                      <div className={styles.sharedFileMeta}>
                        <span className={styles.sharedFileName}>{msg.file_name || 'File'}</span>
                        <span className={styles.sharedFileSize}>{formatSize(msg.file_size)}</span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Members */}
            <div className={styles.infoSection}>
              <div className={styles.infoSectionHeader}>
                <span>MEMBERS</span>
              </div>
              <div className={styles.membersList}>
                {(activeRoom.members || []).filter(m => m.id !== user?.id).map((member) => (
                  <div key={member.id} className={styles.memberItem}>
                    <div className={styles.memberAvatar}>
                      {member.photo ? (
                        <img src={member.photo} alt="" />
                      ) : (
                        <div className={styles.avatarFallbackSm}>
                          {(member.full_name || member.username)?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className={`${styles.presenceDotSm} ${isOnline(member.id) ? styles.presenceOnline : ''}`} />
                    </div>
                    <span className={styles.memberName}>{member.full_name || member.username}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Share */}
            <div className={styles.infoSection}>
              <div className={styles.infoSectionHeader}>
                <span>QUICK SHARE</span>
              </div>
              <div className={styles.quickShareList}>
                {[
                  { icon: FileText, label: 'Attendance Sheet' },
                  { icon: GraduationCap, label: 'Exam Schedule' },
                  { icon: FileText, label: 'Report Template' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} className={styles.quickShareItem}>
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── NEW GROUP MODAL ────────────────────────────────── */}
      {showNewGroup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Create New Group</h3>
              <button className={styles.modalClose} onClick={() => setShowNewGroup(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                type="text"
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className={styles.modalInput}
              />
              <div className={styles.modalSearch}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className={styles.modalSearchInput}
                />
              </div>
              <div className={styles.modalMemberList}>
                {chatUsers
                  .filter((u) =>
                    (u.full_name || u.username).toLowerCase().includes(contactSearch.toLowerCase())
                  )
                  .map((u) => (
                    <label key={u.id} className={styles.modalMemberItem}>
                      <input
                        type="checkbox"
                        checked={newGroupMembers.includes(u.id)}
                        onChange={() => toggleGroupMember(u.id)}
                      />
                      <span className={styles.modalMemberName}>{u.full_name || u.username}</span>
                      <span className={styles.modalMemberRole}>{u.role_name}</span>
                    </label>
                  ))}
              </div>
              {newGroupMembers.length > 0 && (
                <div className={styles.selectedCount}>
                  {newGroupMembers.length} member{newGroupMembers.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setShowNewGroup(false)}>
                Cancel
              </button>
              <button
                className={styles.modalCreateBtn}
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || newGroupMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffChatOverlay;
