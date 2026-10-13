import React, { createContext, useState, useEffect, useContext } from 'react';
import authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = async () => {
    setLoading(true);
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token with backend asynchronously
        const resp = await authApi.getProfile();
        if (resp.data) {
          setUser(resp.data);
          localStorage.setItem('user', JSON.stringify(resp.data));
        }
      } catch (err) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (login_id, password) => {
    const resp = await authApi.login(login_id, password);
    const tokenData = resp.data.access_token;
    const userData = resp.data.user;

    setToken(tokenData);
    setUser(userData);
    localStorage.setItem('auth_token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const loginWithOtp = async (login_id, otp) => {
    const resp = await authApi.verifyOtpLogin(login_id, otp);
    const tokenData = resp.data.access_token;
    const userData = resp.data.user;

    setToken(tokenData);
    setUser(userData);
    localStorage.setItem('auth_token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (formData) => {
    const resp = await authApi.register(formData);
    const tokenData = resp.data.access_token;
    const userData = resp.data.user;

    setToken(tokenData);
    setUser(userData);
    localStorage.setItem('auth_token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const deleteAccount = async () => {
    await authApi.deleteAccount();
    logout();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  const role = user?.role || null;
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        loading,
        login,
        loginWithOtp,
        register,
        deleteAccount,
        logout,
        restoreSession,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
