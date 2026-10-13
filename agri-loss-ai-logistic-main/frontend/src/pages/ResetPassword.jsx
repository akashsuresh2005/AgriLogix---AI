import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import Input from '@/components/forms/Input';
import Button from '@/components/forms/Button';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState(location.state?.login_id || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('Please provide your registered Email or Phone number.');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your contact.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await authApi.resetPassword(loginId.trim(), otp.trim(), password);
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reset password. Please check your OTP and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#e5e9df] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-sm text-slate-500 mt-1">Verify OTP and enter your new password</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-sm flex flex-col items-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-forest-600" />
              <p className="font-bold text-slate-900">Password Updated!</p>
              <p className="text-xs text-slate-600">
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
            </div>
            <Link to="/login">
              <Button variant="primary" className="w-full justify-center shadow-xs">
                Sign In Now
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="farmer@example.com or 9876543210"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                6-Digit Reset OTP
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full tracking-widest text-center text-lg font-mono px-3.5 py-2 rounded-xl bg-white border border-forest-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 shadow-xs"
              />
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full justify-center shadow-xs" isLoading={loading}>
              Update Password
            </Button>

            <div className="text-center text-xs text-slate-500 pt-2">
              <Link to="/login" className="text-forest-700 font-bold hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
