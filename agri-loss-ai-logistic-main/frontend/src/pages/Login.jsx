import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import authApi from '@/api/auth';
import Input from '@/components/forms/Input';
import Button from '@/components/forms/Button';
import { LogIn, AlertCircle, KeyRound, Smartphone, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithOtp } = useAuth();

  const [authMode, setAuthMode] = useState('password'); // 'password' or 'otp'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const user = await login(username, password);
      redirectUser(user);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid username or password.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!username) {
      setError('Please enter your email or phone number first.');
      return;
    }
    try {
      setError(null);
      setSendingOtp(true);
      await authApi.sendOtp(username);
      setOtpSent(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP. Please check your username/email.';
      setError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!username || !otpCode) {
      setError('Please enter your 6-digit OTP code.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const user = await loginWithOtp(username, otpCode);
      redirectUser(user);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired OTP code.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const redirectUser = (user) => {
    const role = user?.role || 'farmer';
    const redirectPath =
      location.state?.from?.pathname ||
      (role === 'admin'
        ? '/admin/dashboard'
        : role === 'warehouse_manager'
        ? '/manager/dashboard'
        : '/farmer/dashboard');

    navigate(redirectPath, { replace: true });
  };

  const fillDemoAccount = (demoUsername, demoPassword) => {
    setAuthMode('password');
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#e5e9df] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sign In to Agri Loss AI Logistic</h2>
          <p className="text-sm text-slate-500 mt-1">Karnataka Agricultural Intelligence Platform</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-forest-50/70 p-1 rounded-xl border border-forest-100 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              authMode === 'password'
                ? 'bg-forest-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-forest-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              authMode === 'otp'
                ? 'bg-forest-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-forest-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>OTP Login</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {authMode === 'password' ? (
          /* Password Login Form */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="farmer@postharvest.in or 9876543210"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <Link to="/forgot-password" className="hover:text-forest-700 font-medium transition-colors">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center mt-2 shadow-xs"
              isLoading={submitting}
            >
              Sign In with Password
            </Button>
          </form>
        ) : (
          /* OTP Login Form */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="farmer@postharvest.in or 9876543210"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={otpSent}
              required
            />

            {!otpSent ? (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={handleSendOtp}
                isLoading={sendingOtp}
              >
                Send 6-Digit OTP Code
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-xs flex items-center justify-between font-medium">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-forest-600" />
                    OTP sent to {username}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-forest-700 hover:underline font-bold"
                  >
                    Change
                  </button>
                </div>

                <Input
                  label="6-Digit OTP Code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center shadow-xs"
                  isLoading={submitting}
                >
                  Verify & Sign In
                </Button>
              </div>
            )}
          </form>
        )}

        {/* Demo Accounts Section */}
        <div className="pt-4 border-t border-[#e5e9df] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Demo Accounts
            </span>
            <span className="text-[11px] text-slate-400">Auto-fill credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('farmer@postharvest.in', 'farmer123')}
              className="p-2.5 rounded-xl bg-forest-50/50 hover:bg-forest-50 border border-forest-200/70 hover:border-forest-400 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <span>👨‍🌾</span>
              <span>Farmer</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('warehouse@postharvest.in', 'warehouse123')}
              className="p-2.5 rounded-xl bg-forest-50/50 hover:bg-forest-50 border border-forest-200/70 hover:border-forest-400 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <span>🏭</span>
              <span>Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('admin@postharvest.in', 'admin123')}
              className="p-2.5 rounded-xl bg-forest-50/50 hover:bg-forest-50 border border-forest-200/70 hover:border-forest-400 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <span>🛡️</span>
              <span>Admin</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#e5e9df] text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-forest-700 font-bold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
