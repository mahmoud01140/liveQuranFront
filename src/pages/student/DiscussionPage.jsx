import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Pin, Trash2, Reply, Users, Smile,
  ChevronDown, X, AlertCircle, Loader2
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useDiscussionStore from '../../store/discussionStore';
import { getSocket, joinGroupRoom } from '../../services/socket';
import { getInitials, getAvatarColor, timeAgoAr } from '../../utils/helpers';
import toast from 'react-hot-toast';

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

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);

  const groupId = user?.group?._id || user?.group;
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const canModerate = isTeacher || isAdmin;

  // Fetch discussion data
  useEffect(() => {
    if (groupId) {
      fetchDiscussion(groupId);
    }
    return () => reset();
  }, [groupId]);

  // Socket setup
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

  // Auto-scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);

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
    setIsSending(false);
    inputRef.current?.focus();

    // Stop typing indicator
    socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Typing indicator
  const handleTyping = () => {
    const socket = getSocket();
    socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('discussion-typing', { groupId, userName: user.firstName, isTyping: false });
    }, 2000);
  };

  // Pin message
  const handlePin = async (msgId) => {
    try {
      await pinMessage(groupId, msgId);
    } catch {
      toast.error('فشل في تثبيت الرسالة');
    }
  };

  // Delete message
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
        <div className="empty-state">
          <AlertCircle className="empty-state-icon" />
          <p className="text-lg font-bold text-gray-500">لم يتم تعيينك في مجموعة بعد</p>
          <p className="text-sm text-gray-400 mt-1">تواصل مع الإدارة لإضافتك إلى مجموعة</p>
        </div>
      </PageLayout>
    );
  }

  const activePinned = pinnedMessages.filter(m => m && !m.isDeleted);

  return (
    <PageLayout>
      <div className="flex flex-col h-[calc(100dvh-10rem)] lg:h-[calc(100vh-7.5rem)]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 sm:p-4 mb-2.5 sm:mb-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-base sm:text-lg leading-tight truncate">غرفة النقاش</h1>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">{groupName || 'مجموعتي'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online count */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-primary-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-semibold text-primary-600">{onlineCount} متصل</span>
            </div>
            {/* Pinned toggle */}
            {activePinned.length > 0 && (
              <button
                onClick={() => setShowPinned(!showPinned)}
                className="flex items-center gap-1 sm:gap-1.5 bg-amber-50 hover:bg-amber-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors"
              >
                <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                <span className="text-[10px] sm:text-xs font-semibold text-amber-600">{activePinned.length} مثبتة</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Pinned messages panel */}
        <AnimatePresence>
          {showPinned && activePinned.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-xl mb-2 sm:mb-3 overflow-hidden flex-shrink-0"
            >
              <div className="p-2.5 sm:p-3 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <span className="text-xs sm:text-sm font-bold text-amber-700">الرسائل المثبتة</span>
                </div>
                <button onClick={() => setShowPinned(false)} className="p-1 hover:bg-amber-100 rounded-lg">
                  <X className="w-4 h-4 text-amber-500" />
                </button>
              </div>
              <div className="p-2.5 sm:p-3 space-y-2 max-h-36 overflow-y-auto">
                {activePinned.map((msg) => (
                  <div key={msg._id} className="bg-white rounded-lg p-2 text-xs sm:text-sm">
                    <span className="font-semibold text-gray-800">
                      {msg.sender?.firstName || 'مستخدم'}:
                    </span>{' '}
                    <span className="text-gray-600">{msg.content}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-3 sm:p-4 space-y-1 relative"
          style={{ scrollBehavior: 'smooth' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle className="w-14 h-14 sm:w-16 sm:h-16 mb-3 text-gray-200" />
              <p className="font-semibold text-sm sm:text-base">لا توجد رسائل بعد</p>
              <p className="text-xs sm:text-sm mt-1">كن أول من يبدأ النقاش! 💬</p>
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

                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex ${isMine ? 'justify-start' : 'justify-end'} ${showHeader ? 'mt-3 sm:mt-4' : 'mt-0.5'}`}
                  >
                    <div className={`max-w-[88%] sm:max-w-[65%] ${isMine ? 'order-1' : 'order-1'}`}>
                      {/* Sender header */}
                      {showHeader && !msg.isDeleted && (
                        <div className={`flex items-center gap-2 mb-1 ${isMine ? '' : 'justify-end'}`}>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(`${msg.sender?.firstName}${msg.sender?.lastName}`) }}
                          >
                            {getInitials(msg.sender?.firstName, msg.sender?.lastName)}
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            {msg.sender?.firstName} {msg.sender?.lastName}
                          </span>
                          {msg.sender?.role === 'teacher' && (
                            <span className="badge-purple text-[10px] py-0.5 px-1.5">معلم</span>
                          )}
                          <span className="text-[10px] text-gray-300">{timeAgoAr(msg.createdAt)}</span>
                        </div>
                      )}

                      {/* Reply preview */}
                      {msg.replyTo && !msg.isDeleted && (
                        <div className={`bg-gray-50 border-r-2 border-primary-300 rounded-lg px-3 py-1.5 mb-1 text-xs text-gray-500 ${isMine ? 'mr-9' : 'ml-9'}`}>
                          رد على رسالة...
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.isDeleted
                            ? 'bg-gray-100 text-gray-400 italic'
                            : isMine
                              ? 'bg-primary-500 text-white rounded-tr-md'
                              : 'bg-gray-100 text-gray-800 rounded-tl-md'
                        } ${showHeader ? (isMine ? 'mr-9' : 'ml-9') : (isMine ? 'mr-9' : 'ml-9')} ${msg.isPinned && !msg.isDeleted ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
                      >
                        {msg.isPinned && !msg.isDeleted && (
                          <Pin className="absolute -top-2 -left-2 w-4 h-4 text-amber-500 bg-white rounded-full p-0.5 shadow" />
                        )}
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>

                        {/* Actions (visible on hover) */}
                        {!msg.isDeleted && (
                          <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-20' : '-right-20'} hidden group-hover:flex items-center gap-1 bg-white shadow-lg rounded-lg px-1.5 py-1 border border-gray-100`}>
                            <button
                              onClick={() => {
                                setReplyTo(msg);
                                inputRef.current?.focus();
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="رد"
                            >
                              <Reply className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            {canModerate && (
                              <button
                                onClick={() => handlePin(msg._id)}
                                className="p-1 hover:bg-amber-50 rounded transition-colors"
                                title={msg.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                              >
                                <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? 'text-amber-500' : 'text-gray-400'}`} />
                              </button>
                            )}
                            {(canModerate || isMine) && (
                              <button
                                onClick={() => handleDelete(msg._id)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-primary-400 text-white w-9 h-9 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-500 transition-colors z-10"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-1"
            >
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {typingUsers.map(u => u.userName).join('، ')} يكتب...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply banner */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-2 mt-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-sm">
                <Reply className="w-4 h-4 text-primary-400" />
                <span className="text-primary-600 font-semibold">رد على {replyTo.sender?.firstName}:</span>
                <span className="text-gray-500 truncate max-w-[200px]">{replyTo.content}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-primary-100 rounded-lg">
                <X className="w-4 h-4 text-primary-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm mt-3 p-3 flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            rows={1}
            className="flex-1 resize-none bg-gray-50 rounded-xl px-4 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary-400/30 placeholder:text-gray-300 max-h-32"
            style={{ minHeight: '42px' }}
            dir="rtl"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              input.trim()
                ? 'bg-primary-400 hover:bg-primary-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <Send className="w-4.5 h-4.5" style={{ transform: 'scaleX(-1)' }} />
          </button>
        </motion.div>
      </div>
    </PageLayout>
  );
}
