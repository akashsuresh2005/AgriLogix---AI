import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import Button from '@/components/forms/Button';
import { UserPlus, AlertCircle, CheckCircle, Mail, KeyRound } from 'lucide-react';

const KARNATAKA_DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    district: '',
    otp: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendOtp = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }
    try {
      setError(null);
      setSendingOtp(true);
      const res = await authApi.sendRegisterOtp(formData.email);
      setOtpSent(true);
      setOtpSuccessMsg(res.data?.message || 'Verification code sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send verification code. Please check your email.';
      setError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpSent || !formData.otp || formData.otp.trim().length !== 6) {
      setError('Please request an OTP and enter the 6-digit code received.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: 'farmer',
        district: formData.district,
        otp: formData.otp.trim(),
      };

      await register(payload);
      
      navigate('/farmer/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check your details and OTP.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white border border-[#e5e9df] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-700 border border-forest-200 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          <p className="text-sm text-slate-500 mt-1">Join Agri Loss AI Logistic Platform</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {otpSuccessMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-sm flex items-start space-x-2 font-medium">
            <CheckCircle className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
            <span>{otpSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="full_name"
            type="text"
            placeholder="e.g. Ramesh Patil"
            value={formData.full_name}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <Select
              label="Karnataka District"
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
              options={KARNATAKA_DISTRICTS.map((d) => ({ value: d, label: d }))}
            />
          </div>

          <div>
            <Input
              label="Password (min. 6 characters)"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address & Verification
            </label>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#cbd5e1] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 text-sm shadow-xs"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !formData.email}
                className="px-4 py-2.5 shrink-0 bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                {sendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send Code'}
              </button>
            </div>
          </div>

          {otpSent && (
            <div className="p-3.5 bg-forest-50/70 border border-forest-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-forest-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Enter 6-Digit Email OTP
              </label>
              <input
                name="otp"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={formData.otp}
                onChange={handleChange}
                required
                className="w-full tracking-widest text-center text-lg font-mono px-3.5 py-2 rounded-xl bg-white border border-forest-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 shadow-xs"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center mt-2 py-3 shadow-xs"
            isLoading={submitting}
            disabled={!otpSent}
          >
            Register & Activate Account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#e5e9df] text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-forest-700 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
