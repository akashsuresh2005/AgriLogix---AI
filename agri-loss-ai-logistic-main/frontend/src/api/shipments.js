import apiClient from './client';

export const shipmentsApi = {
  createShipment: (payload) => apiClient.post('/api/shipments/', payload),
  listShipments: (params = {}) => apiClient.get('/api/shipments/', { params }),
  listActiveShipments: (destination = null) => {
    const params = {};
    if (destination) params.destination = destination;
    return apiClient.get('/api/shipments/active', { params });
  },
  updateShipment: (id, payload) => apiClient.put(`/api/shipments/${id}`, payload),
  getShipment: (id) => apiClient.get(`/api/shipments/${id}`),
};

export default shipmentsApi;
