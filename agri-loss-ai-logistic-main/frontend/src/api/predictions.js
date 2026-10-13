import apiClient from './client';

export const predictionsApi = {
  createPrediction: (payload) => apiClient.post('/api/predictions/', payload),
  listPredictions: (params = {}) => apiClient.get('/api/predictions/', { params }),
  getPrediction: (id) => apiClient.get(`/api/predictions/${id}`),
  checkImageQuality: (imageData) => apiClient.post('/api/predictions/image-quality', { image_data: imageData }),
  getAdvisory: (payload) => apiClient.post('/api/predictions/advisory', payload),
  getTTS: (text, language = 'en') => apiClient.post('/api/predictions/tts', { text, language }, { responseType: 'blob', timeout: 90000 }),
  getWeather: (district) => apiClient.get('/api/weather', { params: { district } }),
  getMarketPrice: (crop, district) => apiClient.get('/api/market/price', { params: { crop, district } }),
};

export default predictionsApi;
