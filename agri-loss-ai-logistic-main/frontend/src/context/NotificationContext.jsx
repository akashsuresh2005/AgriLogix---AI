import React, { createContext, useState, useEffect, useContext } from 'react';
import notificationsApi from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    try {
      const resp = await notificationsApi.getUnreadCount();
      if (resp.data) {
        setUnreadCount(resp.data.unread || 0);
      }
    } catch (e) {
      // Ignore notification fetch errors silently
    }
  };

  const markAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        notifications,
        markAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const useNotification = useNotifications;

export default NotificationContext;
