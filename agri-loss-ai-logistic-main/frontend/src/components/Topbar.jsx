import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import { Menu, Bell, User, Globe, Sprout } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="h-16 bg-white/90 border-b border-stone-200/80 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-stone-500 hover:text-stone-800 p-2 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-stone-600 text-sm">
          <span className="hidden sm:inline font-normal text-stone-500">{t('welcome_back')},</span>
          <span className="font-semibold text-stone-900">{user?.full_name || user?.username}</span>
          {user?.district && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EAF4E6] text-[#075C36] border border-[#DDF3E4]">
              <Sprout className="w-3 h-3 mr-1 text-[#087443]" />
              {user.district}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Language selector toggle */}
        <div className="flex items-center space-x-1.5 text-xs bg-white border border-[#D5E2D2] rounded-xl px-2.5 py-1.5 text-stone-700 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-[#087443]" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-stone-800 border-none outline-none font-medium cursor-pointer text-xs"
          >
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>

        {/* Notifications Icon */}
        <a
          href="/notifications"
          className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-[#EAF4E6] rounded-xl transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#087443] ring-2 ring-white" />
          )}
        </a>

        {/* User Pill */}
        <a
          href="/profile"
          className="flex items-center space-x-2 p-1.5 hover:bg-[#EAF4E6] rounded-xl transition-colors text-stone-700"
        >
          <div className="w-8 h-8 rounded-full bg-[#DDF3E4] border border-[#087443]/30 text-[#075C36] flex items-center justify-center font-bold text-xs">
            {user?.username ? user.username[0].toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline font-medium text-xs text-stone-800">
            {user?.username}
          </span>
        </a>
      </div>
    </header>
  );
}
