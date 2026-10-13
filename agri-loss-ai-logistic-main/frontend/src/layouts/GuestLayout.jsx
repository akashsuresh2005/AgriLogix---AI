import React from 'react';
import { Outlet } from 'react-router-dom';

export default function GuestLayout() {
  return (
    <div className="min-h-screen bg-[#f8f9f6] text-slate-800 flex flex-col justify-between">
      <header className="border-b border-[#e5e9df] bg-white/90 backdrop-blur sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center font-bold text-white shadow-xs text-xs">
              AL
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-forest-900 leading-tight">
                Agri<span className="text-forest-600">Loss</span>
              </span>
              <span className="text-[10px] font-bold text-forest-700 tracking-wider uppercase -mt-0.5">
                AI Logistic
              </span>
            </div>
          </a>
          <nav className="flex items-center space-x-4">
            <a href="/login" className="text-slate-600 hover:text-forest-700 font-semibold text-sm transition-colors">
              Sign In
            </a>
            <a
              href="/register"
              className="bg-forest-600 hover:bg-forest-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[#e5e9df] bg-white py-8 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Agri Loss AI Logistic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
