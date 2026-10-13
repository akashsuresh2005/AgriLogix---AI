import apiClient from './client';

export const farmersApi = {
  getFarmerDashboard: () => apiClient.get('/api/farmers/dashboard'),
  marketRegister: (payload) => apiClient.post('/api/farmers/market-register', payload),
};

export default farmersApi;
