import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import Button from '@/components/forms/Button';
import LoadingState from '@/components/common/LoadingState';
import authApi from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { DISTRICT_LIST } from '@/utils/constants';
import { User, CheckCircle2, Shield, AlertCircle, Trash2, X } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { setUser: setAuthUser, deleteAccount } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const resp = await authApi.getProfile();
        setProfile(resp.data);
        setFullName(resp.data.full_name || '');
        setPhone(resp.data.phone || '');
        setDistrict(resp.data.district || 'Mysuru');
      } catch (err) {
        setError('Failed to fetch user profile data.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const resp = await authApi.updateProfile({
        full_name: fullName,
        phone: phone,
        district: district,
      });
      setProfile(resp.data);
      setAuthUser(resp.data);
      localStorage.setItem('user', JSON.stringify(resp.data));
      setSuccessMsg('Account profile updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile details.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete account. Please try again.';
      setError(msg);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <div className="py-12"><LoadingState label="Loading profile configuration..." /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="User Profile & Credentials"
        subtitle="Manage your personal identification, phone contact, and primary farm district"
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-sm flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Account Card */}
        <div className="bg-white border border-[#e5e9df] rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-forest-50 border-2 border-forest-300 text-forest-700 flex items-center justify-center font-bold text-2xl mb-4 shadow-sm">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">{profile?.full_name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{profile?.email}</p>
          <div className="mt-4 px-3 py-1 rounded-full bg-forest-50 text-forest-700 border border-forest-200 text-xs font-bold uppercase tracking-wider capitalize">
            {profile?.role?.replace('_', ' ')} Account
          </div>
        </div>

        {/* Edit Details Form */}
        <div className="lg:col-span-2 bg-white border border-[#e5e9df] rounded-2xl p-6 space-y-5 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-[#e5e9df] pb-3">
            <User className="w-5 h-5 text-forest-600" />
            <span>Account Parameters</span>
          </h4>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Email Address (Immutable)"
              value={profile?.email || ''}
              disabled
              helperText="Primary email used for account authentication."
            />

            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <Select
              label="Primary Farm / Storage District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              options={DISTRICT_LIST.map((d) => ({ value: d, label: d }))}
            />

            <div className="pt-4 border-t border-[#e5e9df] flex justify-end">
              <Button type="submit" variant="primary" isLoading={saving} className="shadow-xs">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Danger Zone — Account Deletion */}
      <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-red-200/80 pb-3 gap-3">
          <div>
            <h4 className="text-base font-bold text-red-700 flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Danger Zone — Permanent Account Deletion
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Deleting your account will permanently remove all your prediction logs, shipments, and telemetry records.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e9df] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e5e9df] pb-3">
              <h3 className="text-lg font-bold text-red-600 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Confirm Account Deletion
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete account <strong className="text-slate-900">{profile?.email}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-3 border-t border-[#e5e9df] pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccountConfirm}
                isLoading={deleting}
              >
                Permanently Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
