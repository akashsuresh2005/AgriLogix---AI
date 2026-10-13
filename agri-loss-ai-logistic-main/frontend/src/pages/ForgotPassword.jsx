import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import Input from '@/components/forms/Input';
import Button from '@/components/forms/Button';
import { KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('Please enter your registered email address or phone number.');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await authApi.forgotPassword(loginId.trim());
      // Navigate to Reset Password page with login_id prefilled
      navigate('/reset-password', { state: { login_id: loginId.trim() } });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send reset code. Please verify your contact details.';
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
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Forgot Password</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your registered email address or phone number</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email or Phone Number"
            type="text"
            placeholder="farmer@example.com or 9876543210"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full justify-center gap-2 shadow-xs" isLoading={loading}>
            <span>Send Reset OTP</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="text-center text-xs text-slate-500 pt-2">
            <Link to="/login" className="text-forest-700 font-bold hover:underline">
              Return to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
