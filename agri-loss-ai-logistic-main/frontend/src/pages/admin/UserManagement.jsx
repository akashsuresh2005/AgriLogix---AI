import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import LoadingState from '@/components/common/LoadingState';
import Button from '@/components/forms/Button';
import Select from '@/components/forms/Select';
import adminApi from '@/api/admin';
import warehousesApi from '@/api/warehouses';
import { useAuth } from '@/hooks/useAuth';
import { DISTRICT_LIST } from '@/utils/constants';
import { AlertCircle, Save, Trash2, Users } from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [roles, setRoles] = useState({});
  const [districts, setDistricts] = useState({});
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersResponse, facilitiesResponse] = await Promise.all([
        adminApi.listUsers(),
        warehousesApi.listWarehouses(),
      ]);
      const userRows = usersResponse.data || [];
      setUsers(userRows);
      setFacilities(facilitiesResponse.data || []);
      setRoles(Object.fromEntries(userRows.map((row) => [row.id, row.role])));
      setDistricts(Object.fromEntries(userRows.map((row) => [row.id, row.district || ''])));
      setAssignments(Object.fromEntries(userRows.map((row) => [row.id, row.assigned_facilities.map((facility) => facility.id)])));
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load user administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveUser = async (row) => {
    try {
      setSavingId(row.id);
      setError('');
      await adminApi.updateUser(row.id, {
        role: roles[row.id],
        district: districts[row.id] || null,
        assigned_warehouse_ids: roles[row.id] === 'warehouse_manager' ? (assignments[row.id] || []) : [],
      });
      setNotice(`Updated ${row.full_name}.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || `Unable to update ${row.full_name}.`);
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (row) => {
    if (!window.confirm(`Delete the account for ${row.full_name}? Associated shipments, predictions, and notifications will also be removed.`)) return;
    try {
      setSavingId(row.id);
      setError('');
      await adminApi.deleteUser(row.id);
      setNotice(`Deleted ${row.full_name}.`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || `Unable to delete ${row.full_name}.`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage accounts, user roles (Farmer, Warehouse Manager, Admin), and access control"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-forest-200 bg-forest-50 p-3 text-sm text-forest-800 font-medium">
          <span>{notice}</span>
        </div>
      )}
      {loading ? (
        <div className="py-12"><LoadingState label="Loading registered accounts..." /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e5e9df] bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[#e5e9df] bg-forest-50/50 text-xs uppercase text-forest-900 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Account</th>
                <th className="px-4 py-3.5">District</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Assigned Facilities</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e9df]">
              {users.map((row) => (
                <tr key={row.id} className="align-top hover:bg-forest-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{row.full_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.email} · {row.phone}</p>
                  </td>
                  <td className="w-48 px-4 py-4">
                    <Select
                      value={districts[row.id] || ''}
                      onChange={(event) => setDistricts({ ...districts, [row.id]: event.target.value })}
                      options={DISTRICT_LIST.map((district) => ({ value: district, label: district }))}
                    />
                  </td>
                  <td className="w-48 px-4 py-4">
                    <Select
                      value={roles[row.id] || row.role}
                      onChange={(event) => setRoles({ ...roles, [row.id]: event.target.value })}
                      options={[
                        { value: 'farmer', label: 'Farmer' },
                        { value: 'warehouse_manager', label: 'Warehouse Manager' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                    />
                  </td>
                  <td className="w-72 px-4 py-4">
                    {(roles[row.id] || row.role) === 'warehouse_manager' ? (
                      <select
                        multiple
                        value={(assignments[row.id] || []).map(String)}
                        onChange={(event) => setAssignments({
                          ...assignments,
                          [row.id]: Array.from(event.target.selectedOptions, (option) => Number(option.value))
                        })}
                        className="h-24 w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-800 shadow-2xs focus:border-[#087443] focus:outline-none focus:ring-2 focus:ring-[#087443]/20"
                        aria-label={`Facilities assigned to ${row.full_name}`}
                      >
                        {facilities.map((facility) => (
                          <option key={facility.id} value={facility.id} className="py-1 px-1.5 rounded hover:bg-[#EAF4E6]">
                            {facility.facility_name} ({facility.district})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-stone-500 italic font-medium">Not applicable</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => saveUser(row)}
                        isLoading={savingId === row.id}
                      >
                        <Save className="mr-1 h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteUser(row)}
                        disabled={row.id === currentUser?.id || savingId === row.id}
                        title={row.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete account'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <Users className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                    No registered user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
