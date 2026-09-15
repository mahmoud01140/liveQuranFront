import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Pin, Trash2, Reply, ChevronDown, X, AlertCircle, Loader2 } from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useDiscussionStore from '../../store/discussionStore';
import { getSocket } from '../../services/socket';
import { timeAgoAr } from '../../utils/helpers';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ, HqAvatar, HqBadge } from '../../components/halaqa/primitives';

/* غرفة النقاش — talk to the circle without complexity.
   Same socket events, grouping, reply/pin/delete, typing, scroll logic.
   Fix: actions always visible (never hover-only), calmer bubbles. */

export default function DiscussionPage() {
  const { user } = useAuthStore();
  const {
    messages, pinnedMessages, isLoading, onlineCount, typingUsers, groupName,
    fetchDiscussion, addMessage, removeMessage, togglePin, setOnlineCount,
    addTypingUser, removeTypingUser, pinMessage, deleteMessage, reset,
  } = useDiscussionStore();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showPinned, setShowPinned] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);

  const groupId = user?.group?._id || user?.group;
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const canModerate = isTeacher || isAdmin;

  // Fetch discussion data (unchanged)
  useEffect(() => {
    if (groupId) {
      fetchDiscussion(groupId);
    }
    return () => reset();
  }, [groupId]);

  // Socket setup (unchanged)
  useEffect(() => {
    if (!groupId) return;
    const socket = getSocket();

    socket.emit('join-discussion', { groupId });

    socket.on('discussion-message', ({ message }) => {
      addMessage(message);
    });

    socket.on('discussion-message-deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    socket.on('discussion-pin-toggled', ({ messageId, isPinned }) => {
      togglePin(messageId, isPinned);
    });

    socket.on('discussion-online-count', ({ count }) => {
      setOnlineCount(count);
    });

    socket.on('discussion-typing', ({ userId, userName, isTyping }) => {
      if (userId === user?._id) return;
      if (isTyping) {
        addTypingUser(userId, userName);
        setTimeout(() => removeTypingUser(userId), 3000);
      } else {
        removeTypingUser(userId);
      }
    });

    return () => {
      socket.emit('leave-discussion', { groupId });
      socket.off('discussion-message');
      socket.off('discussion-message-deleted');
      socket.off('discussion-pin-toggled');
      socket.off('discussion-online-count');
      socket.off('discussion-typing');
    };
  }, [groupId]);

  // Auto-scroll (unchanged)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll detection (unchanged)
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message (unchanged transport + failed state)
  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    setSendFailed(false);
    try {
      const socket = getSocket();
      socket.emit('send-discussion-message', {
        groupId,
        content: input.trim(),
        type: 'text',
        replyTo: replyTo?._id || null,
        senderName: `${user.firstName} ${user.lastName}`,
      });
      setInput('');
      setReplyTo(null);
      inputRef.current?.focus();
      socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: false });
    } catch {
      setSendFailed(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Typing indicator (unchanged)
  const handleTyping = () => {
    const socket = getSocket();
    socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: false });
    }, 2000);
  };

  // Pin message (unchanged)
  const handlePin = async (msgId) => {
    try {
      await pinMessage(groupId, msgId);
    } catch {
      toast.error('فشل في تثبيت الرسالة');
    }
  };

  // Delete message (unchanged)
  const handleDelete = async (msgId) => {
    try {
      await deleteMessage(groupId, msgId);
    } catch {
      toast.error('فشل في حذف الرسالة');
    }
  };

  // No group assigned
  if (!groupId) {
    return (
      <PageLayout>
        <div className="halaqa" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <AlertCircle size={40} color={HQ.MUTED} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 18, fontWeight: 900, color: HQ.INK, margin: '0 0 4px' }}>لم يتم تعيينك في مجموعة بعد</p>
          <p style={{ fontSize: 14, color: HQ.MUTED, margin: 0 }}>تواصل مع الإدارة لإضافتك إلى مجموعة</p>
        </div>
      </PageLayout>
    );
  }

  const activePinned = pinnedMessages.filter(m => m && !m.isDeleted);
  const iconBtn = {
    background: 'none', border: 'none', cursor: 'pointer', minWidth: 44, minHeight: 44,
    borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 10rem)', maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: HQ.MENTOR, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <MessageCircle size={19} color="#fff" />
            </span>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontWeight: 900, color: HQ.INK, fontSize: 18, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>نقاش الحلقة</h1>
              <p style={{ margin: 0, fontSize: 12, color: HQ.MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName || 'مجموعتي'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 800, color: HQ.MENTOR }}>
              <span className="hq-live-dot" aria-hidden style={{ background: HQ.MENTOR, animation: 'none', opacity: 1 }} />
              {onlineCount} متصل
            </span>
            {activePinned.length > 0 && (
              <button type="button" onClick={() => setShowPinned(!showPinned)} aria-expanded={showPinned}
                style={{ ...iconBtn, width: 'auto', padding: '0 14px', gap: 6, background: '#F8EDD3', fontSize: 12, fontWeight: 800, color: HQ.INK }}>
                <Pin size={14} /> {activePinned.length} مثبتة
              </button>
            )}
          </div>
        </div>

        {/* Pinned panel */}
        {showPinned && activePinned.length > 0 && (
          <div style={{ background: '#F8EDD3', border: '1px solid #D9A441', borderRadius: 14, marginBottom: 10, overflow: 'hidden', flex: 'none' }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #D9A441' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: HQ.INK }}>
                <Pin size={15} /> المثبتة
              </span>
              <button type="button" onClick={() => setShowPinned(false)} aria-label="إخفاء المثبتة" style={{ ...iconBtn }}>
                <X size={17} color={HQ.MUTED} />
              </button>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
              {activePinned.map((msg) => (
                <div key={msg._id} style={{ background: HQ.SURFACE, borderRadius: 10, padding: '8px 12px', fontSize: 14 }}>
                  <strong style={{ color: HQ.INK }}>{msg.sender?.firstName || 'مستخدم'}: </strong>
                  <span style={{ color: HQ.MUTED }}>{msg.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={chatContainerRef} onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: '12px 14px', position: 'relative' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: HQ.MUTED, fontSize: 14, fontWeight: 700 }}>
              <Loader2 size={20} className="animate-spin" /> جارٍ تحميل النقاش...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: HQ.MUTED }}>
              <MessageCircle size={52} color={HQ.LINE} style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 800, fontSize: 16, color: HQ.INK, margin: '0 0 4px' }}>لا رسائل بعد</p>
              <p style={{ fontSize: 14, margin: 0 }}>كن أول من يبدأ النقاش مع حلقتك</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isMine = msg.sender?._id === user._id;
                const prevMsg = messages[idx - 1];
                const sameUser = prevMsg?.sender?._id === msg.sender?._id;
                const timeDiff = prevMsg
                  ? (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) / 60000
                  : 999;
                const showHeader = !sameUser || timeDiff > 5;
                const isStaff = msg.sender?.role === 'teacher' || msg.sender?.role === 'admin';

                return (
                  <div key={msg._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-start' : 'flex-end', marginTop: showHeader ? 14 : 3 }}>
                    <div style={{ maxWidth: '85%', minWidth: 0 }}>
                      {showHeader && !msg.isDeleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, justifyContent: isMine ? 'flex-start' : 'flex-end' }}>
                          <HqAvatar firstName={msg.sender?.firstName} lastName={msg.sender?.lastName} size={28} />
                          <span style={{ fontSize: 13, fontWeight: 800, color: HQ.INK }}>
                            {msg.sender?.firstName} {msg.sender?.lastName}
                          </span>
                          {isStaff && <HqBadge tone="guide">{msg.sender?.role === 'admin' ? 'المعلم والمدير' : 'معلم'}</HqBadge>}
                          <span style={{ fontSize: 11, color: HQ.MUTED }}>{timeAgoAr(msg.createdAt)}</span>
                        </div>
                      )}

                      {msg.replyTo && !msg.isDeleted && (
                        <div style={{ background: HQ.PAPER, borderRight: `2px solid ${HQ.LINE}`, borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: 12, color: HQ.MUTED }}>
                          رد على رسالة سابقة
                        </div>
                      )}

                      <div style={{
                        borderRadius: 16, padding: '10px 14px', fontSize: 14, lineHeight: 1.8,
                        overflowWrap: 'break-word', whiteSpace: 'pre-wrap',
                        background: msg.isDeleted ? HQ.PAPER : isMine ? HQ.MENTOR : HQ.PAPER,
                        color: msg.isDeleted ? HQ.MUTED : isMine ? '#fff' : HQ.INK,
                        border: !isMine && !msg.isDeleted ? `1px solid ${HQ.LINE}` : 'none',
                        fontStyle: msg.isDeleted ? 'italic' : 'normal',
                        outline: msg.isPinned && !msg.isDeleted ? '2px solid #D9A441' : 'none',
                      }}>
                        {msg.isPinned && !msg.isDeleted && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#B45309', marginBottom: 2 }}>
                            <Pin size={11} /> مثبتة
                          </span>
                        )}
                        <span style={{ display: 'block' }}>{msg.content}</span>
                      </div>

                      {/* Actions — always visible, never hover-only */}
                      {!msg.isDeleted && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: isMine ? 'flex-start' : 'flex-end' }}>
                          <button type="button" aria-label="رد على الرسالة"
                            onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} style={{ ...iconBtn, color: HQ.MUTED }}>
                            <Reply size={15} />
                          </button>
                          {canModerate && (
                            <button type="button" aria-label={msg.isPinned ? 'إلغاء التثبيت' : 'تثبيت الرسالة'} aria-pressed={msg.isPinned}
                              onClick={() => handlePin(msg._id)} style={{ ...iconBtn, color: msg.isPinned ? '#B45309' : HQ.MUTED }}>
                              <Pin size={15} />
                            </button>
                          )}
                          {(canModerate || isMine) && (
                            <button type="button" aria-label="حذف الرسالة"
                              onClick={() => handleDelete(msg._id)} style={{ ...iconBtn, color: HQ.MUTED }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {showScrollBtn && (
            <button type="button" onClick={scrollToBottom} aria-label="النزول لآخر الرسائل"
              style={{ position: 'sticky', bottom: 8, display: 'flex', margin: '8px auto 0', width: 44, height: 44, borderRadius: 9999, border: 'none', background: HQ.MENTOR, color: '#fff', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronDown size={20} />
            </button>
          )}
        </div>

        {/* Typing */}
        {typingUsers.length > 0 && (
          <p style={{ margin: '6px 2px 0', fontSize: 12, color: HQ.MUTED }}>
            {typingUsers.map(u => u.userName).join('، ')} يكتب...
          </p>
        )}

        {/* Reply banner */}
        {replyTo && (
          <div style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 12px', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, color: HQ.MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              رد على {replyTo.sender?.firstName}: {replyTo.content}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="إلغاء الرد" style={{ ...iconBtn }}>
              <X size={16} color={HQ.MUTED} />
            </button>
          </div>
        )}

        {/* Failed state */}
        {sendFailed && (
          <p role="alert" style={{ margin: '6px 2px 0', fontSize: 13, fontWeight: 700, color: '#C2410C' }}>
            تعذّر الإرسال — تحقق من الاتصال وحاول مجددًا.
          </p>
        )}

        {/* Input */}
        <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginTop: 8, padding: 10, display: 'flex', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
          <textarea ref={inputRef} value={input} rows={1} aria-label="اكتب رسالتك"
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك لحلقتك..."
            style={{ flex: 1, resize: 'none', background: HQ.PAPER, borderRadius: 12, border: 'none', padding: '12px 14px', fontSize: 14, color: HQ.INK, fontFamily: 'inherit', minHeight: 48, maxHeight: 120 }} />
          <button type="button" onClick={handleSend} disabled={!input.trim() || isSending} aria-label="إرسال"
            style={{
              flex: 'none', width: 48, height: 48, borderRadius: 12, border: 'none',
              background: input.trim() ? HQ.MENTOR : HQ.PAPER, color: input.trim() ? '#fff' : HQ.MUTED,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Send size={18} style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
