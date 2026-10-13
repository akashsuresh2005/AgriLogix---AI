import apiClient from './client';

export const authApi = {
  sendRegisterOtp: (email) => apiClient.post('/api/auth/register-otp', { email }),
  register: (payload) => apiClient.post('/api/auth/register', payload),
  login: (login_id, password) => apiClient.post('/api/auth/login', { login_id, password }),
  sendOtp: (login_id) => apiClient.post('/api/auth/send-otp', { login_id }),
  verifyOtpLogin: (login_id, otp) => apiClient.post('/api/auth/verify-otp-login', { login_id, otp }),
  forgotPassword: (login_id) => apiClient.post('/api/auth/forgot-password', { login_id }),
  resetPassword: (login_id, otp, new_password) => apiClient.post('/api/auth/reset-password', { login_id, otp, new_password }),
  getProfile: () => apiClient.get('/api/auth/me'),
  updateProfile: (payload) => apiClient.put('/api/auth/me', payload),
  deleteAccount: () => apiClient.delete('/api/auth/account'),
};

export default authApi;
