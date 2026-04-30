'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Send, Search, Paperclip, Phone, MoreHorizontal,
  Users, UserPlus, Plus, FileText, Image as ImageIcon,
  GraduationCap, Smile, ChevronDown, Hash, Lock,
  Download, CheckCheck, Clock, ArrowLeft, Share2, Forward,
  Grid, BarChart2, Link, Mic, Square, Trash2, Copy,
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import instance from '@/api/instance';
import styles from './ChatWindow.module.css';

const ATTACH_OPTIONS = [
  { id: 'file', label: 'File', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip' },
  { id: 'photo', label: 'Photo', icon: ImageIcon, accept: 'image/*' },
  { id: 'academic', label: 'Academic', icon: GraduationCap, accept: '.pdf,.doc,.docx,.xls,.xlsx' },
  { id: 'table', label: 'Table', icon: Grid },
  { id: 'report', label: 'Report', icon: BarChart2 },
];

const COMMON_EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '🔥', '❤️', '✨', '🙌', '🎉', '✅', '❌'];

const StaffChatOverlay = () => {
  const router = useRouter();
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [tableData, setTableData] = useState([['Header 1', 'Header 2'], ['Data 1', 'Data 2']]);
  const [composerPreview, setComposerPreview] = useState(null); // { type, data, file }
  const [caption, setCaption] = useState('');
  
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [mobileView, setMobileView] = useState('sidebar'); // sidebar | chat | info
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showFwdModal, setShowFwdModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [shareAnchor, setShareAnchor] = useState(null);
  const [messageToShare, setMessageToShare] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileCategory = useRef('file');

  useEffect(() => {
    if (mainChatOpen) {
      fetchRooms();
      fetchChatUsers();
    }
  }, [mainChatOpen]); // eslint-disable-line

  // Auto-scroll removed as per user request to prevent interference

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
    await sendMessage(activeRoom.id, inputValue);
    setInputValue('');
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = (opt) => {
    if (opt.id === 'table') {
      setShowTableModal(true);
      setShowAttach(false);
      return;
    }
    if (opt.id === 'report') {
      fetchSavedReports();
      setShowReportModal(true);
      setShowAttach(false);
      return;
    }
    fileCategory.current = opt.id;
    fileInputRef.current.accept = opt.accept;
    fileInputRef.current.click();
    setShowAttach(false);
  };

  const fetchSavedReports = async () => {
    try {
      const res = await instance.get('/reports/saved/');
      setSavedReports(res.data);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;
    
    // Preview before sending
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setComposerPreview({ type: 'image', data: ev.target.result, file });
      };
      reader.readAsDataURL(file);
    } else {
      await uploadFile(activeRoom.id, file, fileCategory.current);
    }
    e.target.value = '';
  };

  const addEmoji = (emoji) => {
    setInputValue((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleCreateTable = () => {
    if (!activeRoom) return;
    setComposerPreview({ type: 'table', data: tableData });
    setShowTableModal(false);
  };

  const handleSendComposer = async () => {
    if (!activeRoom || !composerPreview) return;
    const { type, data, file } = composerPreview;
    
    if (type === 'image') {
      await uploadFile(activeRoom.id, file, 'photo', caption);
    } else if (type === 'table') {
      await sendMessage(activeRoom.id, JSON.stringify(data), 'table');
      if (caption.trim()) {
        await sendMessage(activeRoom.id, caption);
      }
    }
    
    setComposerPreview(null);
    setCaption('');
    setTableData([['Header 1', 'Header 2'], ['Data 1', 'Data 2']]);
    setTimeout(scrollToBottom, 100);
  };

  const handleShareReport = async (report) => {
    if (!activeRoom) return;
    await sendMessage(activeRoom.id, JSON.stringify(report), 'report');
    setShowReportModal(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isAtBottom);
  };

  const openRoom = (room) => {
    selectRoom(room);
    setMobileView('chat');
    setTimeout(scrollToBottom, 200);
  };

  const handleForward = (msg) => {
    setMessageToForward(msg);
    setShowFwdModal(true);
  };

  const confirmForward = async (room) => {
    if (!messageToForward) return;
    const msg = messageToForward;
    
    // Logic to forward based on category
    if (msg.category === 'text') {
      await sendMessage(room.id, msg.content);
    } else if (msg.category === 'photo' || msg.category === 'file') {
      // For images/files, we might need a dedicated forward endpoint or re-upload
      // Simplified: share content/url
      await sendMessage(room.id, `Forwarded: ${msg.file_url}`, 'text');
    } else if (msg.category === 'table' || msg.category === 'report') {
      await sendMessage(room.id, msg.content, msg.category);
    }
    
    setShowFwdModal(false);
    setMessageToForward(null);
    if (room.id === activeRoom?.id) scrollToBottom();
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadFile(activeRoom.id, file, 'audio');
        stream.getTracks().forEach(track => track.stop());
        setTimeout(scrollToBottom, 200);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access denied', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = null; // Don't upload
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatRecordTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async (msg, e) => {
    // If it's a mobile device, native share is okay
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
      try {
        const text = msg.content || 'Check out this shared item from CMS';
        const url = msg.file_url || window.location.href;
        await navigator.share({ title: 'CMS Chat', text, url });
        return;
      } catch (err) { console.log('Native share failed', err); }
    }

    // On Desktop, use our custom menu to avoid blocking tabs
    setMessageToShare(msg);
    setShareAnchor(e.currentTarget.getBoundingClientRect());
  };

  const shareToWhatsApp = (msg) => {
    const text = msg.content || 'Check out this shared item from CMS';
    const url = msg.file_url || window.location.href;
    const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`;
    window.open(waUrl, '_blank');
    setShareAnchor(null);
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
              <div className={styles.messagesContainer} ref={messagesContainerRef} onScroll={handleScroll}>
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
                          <div className={`${styles.messageBubbleContainer} ${isMe ? styles.messageBubbleContainerMe : ''}`}>
                            <div className={`
                              ${styles.messageBubble} 
                              ${isMe ? styles.messageBubbleMe : ''} 
                              ${(msg.category === 'table' || msg.category === 'report') ? styles.messageBubblePlain : ''}
                            `}>
                              {/* Hover Actions */}
                               <div className={styles.messageActions}>
                                 {(msg.category === 'photo' || msg.category === 'file' || msg.category === 'audio') ? (
                                   <button className={styles.actionBtn} title="Download" onClick={() => {
                                     const link = document.createElement('a');
                                     link.href = msg.file_url;
                                     link.setAttribute('download', msg.file_name || 'download');
                                     document.body.appendChild(link);
                                     link.click();
                                     document.body.removeChild(link);
                                   }}>
                                     <Download size={14} />
                                   </button>
                                 ) : (
                                   <button className={styles.actionBtn} title="Copy Text" onClick={() => copyToClipboard(msg.content)}>
                                     <Copy size={14} />
                                   </button>
                                 )}
                                 {msg.file_url && (
                                   <button className={styles.actionBtn} title="Copy Link" onClick={() => copyToClipboard(msg.file_url)}>
                                     <Link size={14} />
                                   </button>
                                 )}
                                 <button className={styles.actionBtn} title="Forward" onClick={() => handleForward(msg)}>
                                   <Forward size={14} />
                                 </button>
                                 <button className={styles.actionBtn} title="Share" onClick={(e) => handleShare(msg, e)}>
                                   <Share2 size={14} />
                                 </button>
                               </div>

                              {!isMe && activeRoom.room_type === 'group' && (
                                <span className={styles.senderLabel}>{msg.sender?.full_name}</span>
                              )}
                              {isImage && (
                                <img
                                  src={msg.file_url}
                                  alt=""
                                  className={styles.msgImageFull}
                                  onClick={() => setLightboxImage(msg.file_url)}
                                />
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
                              {msg.category === 'table' && (
                                <div className={styles.tableBubble}>
                                  <table>
                                    <tbody>
                                      {(() => {
                                        try {
                                          const data = JSON.parse(msg.content);
                                          return data.map((row, i) => (
                                            <tr key={i}>
                                              {row.map((cell, j) => (
                                                <td key={j} className={i === 0 ? styles.tableHeader : ''}>
                                                  {cell}
                                                </td>
                                              ))}
                                            </tr>
                                          ));
                                        } catch (e) {
                                          return <tr><td>Invalid table data</td></tr>;
                                        }
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {msg.category === 'report' && (
                                <div className={styles.reportBubble}>
                                  <div className={styles.reportIcon}>
                                    <BarChart2 size={24} />
                                  </div>
                                  <div className={styles.reportInfo}>
                                    {(() => {
                                      try {
                                        const report = JSON.parse(msg.content);
                                        return (
                                          <>
                                            <span className={styles.reportName}>{report.name}</span>
                                            <span className={styles.reportModule}>Module: {report.module}</span>
                                            <button className={styles.viewReportBtn} onClick={() => {
                                              router.push(`/admins/reports?id=${report.id}`);
                                            }}>
                                              View Dynamic Report
                                            </button>
                                          </>
                                        );
                                      } catch (e) {
                                        return <span>Invalid report data</span>;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                              {msg.category === 'audio' && (
                                <div className={styles.audioBubble}>
                                  <audio src={msg.file_url} controls className={styles.audioPlayer} />
                                </div>
                              )}
                              {msg.content && msg.category !== 'table' && msg.category !== 'report' && msg.category !== 'audio' && (
                                <p className={styles.msgContent}>{msg.content}</p>
                              )}
                              <div className={styles.msgMeta}>
                                <span className={styles.msgTimestamp}>{formatFullTime(msg.timestamp)}</span>
                                {isMe && (
                                  <span className={`${styles.readReceipt} ${msg.read_by_ids?.length > 1 ? styles.readReceiptSeen : ''}`}>
                                    <CheckCheck size={14} />
                                  </span>
                                )}
                              </div>
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

              {/* Scroll to Bottom Button */}
              {showScrollBottom && (
                <button className={styles.scrollBottomBtn} onClick={scrollToBottom}>
                  <ChevronDown size={20} />
                </button>
              )}

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
                <div className={styles.emojiPickerWrapper}>
                  <button className={styles.attachOption} onClick={() => setShowEmoji(!showEmoji)}>
                    <Smile size={18} />
                    <span>Emoji</span>
                  </button>
                  {showEmoji && (
                    <div className={styles.emojiPicker}>
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className={styles.emojiBtn}
                          onClick={() => addEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Input Bar */}
              <div className={styles.inputBar}>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                />
                
                {isRecording ? (
                  <div className={styles.recordingInterface}>
                    <div className={styles.recordingPulse} />
                    <span className={styles.recordingTime}>{formatRecordTime(recordingTime)}</span>
                    <button className={styles.recordingCancel} onClick={() => stopRecording(false)}>
                      <Trash2 size={18} />
                    </button>
                    <button className={styles.recordingStop} onClick={() => stopRecording(true)}>
                      <Send size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className={styles.chatInput}
                    />
                    <div className={styles.inputActions}>
                      <button className={styles.micBtn} onClick={startRecording}>
                        <Mic size={18} />
                      </button>
                      <button
                        className={styles.chatSendBtn}
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </>
                )}
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
              <span>{activeRoom.room_type === 'group' ? 'Group Details' : 'Contact Info'}</span>
            </div>

            {/* Profile Header for Direct Chat */}
            {activeRoom.room_type === 'direct' && (() => {
              const other = activeRoom.members?.find(m => m.id !== user?.id);
              return (
                <div className={styles.profileHeader}>
                  <div className={styles.profileAvatar}>
                    {other?.photo ? <img src={other.photo} alt="" /> : <div className={styles.avatarFallbackLg}>{other?.full_name?.[0]}</div>}
                    <span className={`${styles.presenceDotLg} ${isOnline(other?.id) ? styles.presenceOnline : ''}`} />
                  </div>
                  <h3 className={styles.profileName}>{other?.full_name || other?.username}</h3>
                  <span className={styles.profileRole}>{other?.role_name || 'Staff Member'}</span>
                </div>
              );
            })()}

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

            {/* Members (Groups Only) */}
            {activeRoom.room_type === 'group' && (
              <div className={styles.infoSection}>
                <div className={styles.infoSectionHeader}>
                  <span>MEMBERS</span>
                  <span className={styles.memberCount}>{activeRoom.members?.length || 0}</span>
                </div>
                <div className={styles.membersList}>
                  {(activeRoom.members || []).map((member) => (
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
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{member.full_name || member.username}</span>
                        <span className={styles.memberRoleLabel}>{member.role_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
      {/* Table Builder Modal */}
      {showTableModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Create Custom Table</h3>
              <button className={styles.modalClose} onClick={() => setShowTableModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tableEditor}>
                <table className={styles.editTable}>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newData = [...tableData];
                                newData[i][j] = e.target.value;
                                setTableData(newData);
                              }}
                              className={i === 0 ? styles.tableInputHeader : styles.tableInput}
                            />
                          </td>
                        ))}
                        <td>
                          <button onClick={() => {
                            const newData = tableData.filter((_, idx) => idx !== i);
                            setTableData(newData);
                          }} className={styles.rowAction}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableControls}>
                <button onClick={() => setTableData([...tableData, Array(tableData[0]?.length || 2).fill('')])}>
                  + Add Row
                </button>
                <button onClick={() => {
                  const newData = tableData.map(row => [...row, '']);
                  setTableData(newData);
                }}>
                  + Add Column
                </button>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setShowTableModal(false)}>Cancel</button>
              <button className={styles.modalCreateBtn} onClick={handleCreateTable}>Send Table</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Selector Modal */}
      {showReportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Share Dynamic Report</h3>
              <button className={styles.modalClose} onClick={() => setShowReportModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.reportList}>
                {savedReports.length === 0 ? (
                  <div className={styles.infoEmpty}>No saved reports found</div>
                ) : (
                  savedReports.map(report => (
                    <button key={report.id} className={styles.reportSelectItem} onClick={() => handleShareReport(report)}>
                      <BarChart2 size={16} />
                      <div className={styles.reportSelectInfo}>
                        <span className={styles.reportSelectName}>{report.name}</span>
                        <span className={styles.reportSelectMeta}>{report.module} · {new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Share Menu */}
      {shareAnchor && messageToShare && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setShareAnchor(null)} />
          <div 
            className={styles.shareMenu}
            style={{ 
              top: shareAnchor.bottom + 5,
              left: shareAnchor.left - 120
            }}
          >
            <button onClick={() => { copyToClipboard(messageToShare.file_url || messageToShare.content); setShareAnchor(null); }}>
              <Link size={14} /> Copy Link
            </button>
            <button onClick={() => shareToWhatsApp(messageToShare)}>
              <Smile size={14} /> Share to WhatsApp
            </button>
            <button onClick={() => { handleForward(messageToShare); setShareAnchor(null); }}>
              <Forward size={14} /> Forward in CMS
            </button>
          </div>
        </>
      )}

      {/* Forward Modal */}
      {showFwdModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Forward Message</h3>
              <button className={styles.modalClose} onClick={() => setShowFwdModal(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalSearch}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className={styles.modalSearchInput}
                />
              </div>
              <div className={styles.modalMemberList}>
                {rooms
                  .filter(r => r.display_name?.toLowerCase().includes(contactSearch.toLowerCase()))
                  .map(room => (
                    <div key={room.id} className={styles.modalMemberItem} onClick={() => confirmForward(room)} style={{ cursor: 'pointer' }}>
                      <div className={styles.memberAvatar}>
                        {room.display_photo ? <img src={room.display_photo} alt="" /> : <div className={styles.avatarFallbackSm}>{room.display_name?.[0]}</div>}
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{room.display_name}</span>
                        <span className={styles.memberRoleLabel}>{room.room_type}</span>
                      </div>
                      <button className={styles.modalCreateBtn} style={{ padding: '4px 12px', fontSize: '0.75rem', marginLeft: 'auto' }}>Send</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer Preview (WhatsApp Style) */}
      {composerPreview && (
        <div className={styles.composerOverlay}>
          <div className={styles.composerContent}>
            <div className={styles.composerHeader}>
              <button onClick={() => setComposerPreview(null)}><X size={20} /></button>
              <span>{composerPreview.type === 'image' ? 'Send Image' : 'Send Table'}</span>
            </div>
            <div className={styles.composerBody}>
              {composerPreview.type === 'image' ? (
                <img src={composerPreview.data} alt="Preview" className={styles.composerImage} />
              ) : (
                <div className={styles.composerTableWrapper}>
                  <table className={styles.previewTable}>
                    <tbody>
                      {composerPreview.data.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className={i === 0 ? styles.tableHeader : ''}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.composerFooter}>
              <div className={styles.composerInputWrapper}>
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComposer()}
                />
                <button onClick={handleSendComposer} className={styles.composerSendBtn}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className={styles.lightbox} onClick={() => setLightboxImage(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImage(null)}>
            <X size={24} />
          </button>
          <img src={lightboxImage} alt="Preview" className={styles.lightboxImage} />
        </div>
      )}
    </div>
  );
};

export default StaffChatOverlay;
