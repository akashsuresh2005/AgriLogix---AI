import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Sprout,
  History,
  TrendingDown,
  Warehouse,
  Truck,
  Boxes,
  ShieldAlert,
  Users,
  Activity,
  Cpu,
  Bell,
  User,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const role = user?.role || 'farmer';

  const navByRole = {
    farmer: [
      { name: t('dashboard'), path: '/farmer/dashboard', icon: LayoutDashboard },
      { name: t('new_prediction'), path: '/farmer/predict', icon: Sprout },
      { name: t('my_predictions'), path: '/farmer/predictions', icon: History },
      { name: t('loss_analysis'), path: '/farmer/loss-analysis', icon: TrendingDown },
      { name: t('warehouse_finder'), path: '/farmer/warehouses', icon: Warehouse },
      { name: t('shipment_booking'), path: '/farmer/shipments', icon: Truck },
    ],
    warehouse_manager: [
      { name: 'Manager Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
      { name: 'Warehouse Capacity', path: '/manager/capacity', icon: Boxes },
      { name: 'Incoming Shipments', path: '/manager/shipments', icon: Truck },
      { name: 'Stock Risk Monitoring', path: '/manager/risk-monitoring', icon: ShieldAlert },
    ],
    admin: [
      { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Facility Management', path: '/admin/facilities', icon: Warehouse },
      { name: 'User Management', path: '/admin/users', icon: Users },
      { name: 'System Health', path: '/admin/system-health', icon: Activity },
      { name: 'Model Performance', path: '/admin/model-performance', icon: Cpu },
    ],
  };

  const navItems = navByRole[role] || navByRole.farmer;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-stone-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-stone-200/90">
          <NavLink to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#075C36] flex items-center justify-center font-bold text-white shadow-xs">
              <Sprout className="w-4.5 h-4.5 text-[#D6A72C]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#17251B] block leading-tight">
                Agri<span className="text-[#087443]">Loss</span>
              </span>
              <span className="text-[9.5px] font-medium text-stone-500 uppercase tracking-widest block">
                AI Logistic
              </span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden text-stone-400 hover:text-stone-700 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-6 py-2.5 bg-[#EAF4E6]/60 border-b border-stone-200/70 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Workspace
          </span>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#DDF3E4] text-[#075C36] border border-[#087443]/30 capitalize">
            {role.replace('_', ' ')}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#DDF3E4] text-[#075C36] border border-[#087443]/30 font-semibold shadow-xs'
                      : 'text-[#17251B]/80 hover:bg-[#EAF4E6] hover:text-[#075C36]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#087443]' : 'text-stone-400'}`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 mt-2 border-t border-stone-200/80 space-y-1">
            <NavLink
              to="/notifications"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#DDF3E4] text-[#075C36] border border-[#087443]/30 font-semibold'
                    : 'text-[#17251B]/80 hover:bg-[#EAF4E6] hover:text-[#075C36]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Bell className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                  <span>{t('notifications')}</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90 font-semibold'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <User className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                  <span>{t('profile')}</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User Footer */}
        <div className="p-3.5 border-t border-stone-200/90 bg-stone-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.username ? user.username[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-900 truncate">{user?.full_name || user?.username || 'User'}</p>
                <p className="text-[11px] text-stone-500 truncate">{user?.district ? `${user.district}` : (user?.email || '')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title={t('logout')}
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
