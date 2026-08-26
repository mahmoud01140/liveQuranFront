import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../store/notificationStore';
import useAuthStore from '../../store/authStore';
import { NOTIFICATION_TYPES } from '../../utils/constants';
import { timeAgoAr } from '../../utils/helpers';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) markAsRead(notif._id);
    setIsOpen(false);

    if (notif.data?.link) {
      navigate(notif.data.link);
      return;
    }

    const role = user?.role || 'student';
    const rolePrefix = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student';

    switch (notif.type) {
      case 'live_starting':
        navigate(role === 'student' ? '/student/group' : `${rolePrefix}/live`);
        break;
      case 'exam_scheduled':
        navigate(`${rolePrefix}/exams`);
        break;
      case 'result_ready':
        navigate(`${rolePrefix}/progress`);
        break;
      case 'group_assigned':
        navigate(role === 'teacher' ? '/teacher/groups' : '/student/group');
        break;
      case 'plan_updated':
        navigate(`${rolePrefix}/curriculum`);
        break;
      case 'message':
      case 'general':
      default:
        // No specific route, just read it
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-primary-50 transition-colors text-gray-600"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-400 hover:text-primary-500 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    قراءة الكل
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const typeInfo = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.general;
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <span className="text-lg mt-0.5 flex-shrink-0">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgoAr(notif.sentAt)}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {!notif.isRead && <div className="w-2 h-2 bg-primary-400 rounded-full" />}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                          className="p-1 hover:bg-red-50 hover:text-red-400 rounded-lg transition-colors text-gray-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
