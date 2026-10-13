import apiClient from './client';

export const adminApi = {
  listUsers: () => apiClient.get('/api/admin/users'),
  updateUser: (id, payload) => apiClient.put(`/api/admin/users/${id}`, payload),
  deleteUser: (id) => apiClient.delete(`/api/admin/users/${id}`),
  getModelPerformance: () => apiClient.get('/api/admin/model-performance'),
};

export default adminApi;