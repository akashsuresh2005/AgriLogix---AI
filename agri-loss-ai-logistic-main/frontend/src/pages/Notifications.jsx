import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/forms/Button';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import notificationsApi from '@/api/notifications';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/utils/formatters';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

function notificationText(message = '') {
  return message
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

export default function Notifications() {
  const { fetchUnreadCount } = useNotification();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const resp = await notificationsApi.listNotifications();
      setNotifications(resp.data || []);
      fetchUnreadCount();
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifs();
    } catch (e) {
      // Handle error
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifs();
    } catch (e) {
      // Handle error
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('notifications_title')}
        subtitle="High-risk prediction alerts, cold storage arrivals, and shipment dispatch notices"
        action={
          notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              {t('mark_all_read')}
            </Button>
          )
        }
      />

      {loading ? (
        <div className="py-12"><LoadingState label="Loading notification feeds..." /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('no_notifications')}
          description="You're all caught up! High-risk alert updates and shipment events will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                n.is_read
                  ? 'bg-white border-[#e5e9df] opacity-75 hover:opacity-100 hover:border-forest-200'
                  : 'bg-white border-forest-300 shadow-sm ring-1 ring-forest-500/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    {!n.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-forest-600 ring-4 ring-forest-100" />
                    )}
                    <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  </div>
                  <p className="text-slate-600 text-xs mt-1.5 leading-relaxed whitespace-pre-line">{notificationText(n.message)}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap ml-4">
                  {formatDate(n.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
