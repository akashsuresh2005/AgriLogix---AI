import apiClient from './client';

export const notificationsApi = {
  listNotifications: () => apiClient.get('/api/notifications/'),
  getUnreadCount: () => apiClient.get('/api/notifications/unread-count'),
  markAsRead: (id) => apiClient.put(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/api/notifications/read-all'),
};

export default notificationsApi;
