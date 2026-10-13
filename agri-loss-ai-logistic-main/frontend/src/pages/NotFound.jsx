import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/forms/Button';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-[#e5e9df] rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">404 — Page Not Found</h2>
          <p className="text-sm text-slate-500 mt-2">
            The resource or page you requested does not exist or has been moved.
          </p>
        </div>
        <Link to="/" className="inline-block w-full">
          <Button variant="primary" className="w-full justify-center shadow-xs">
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
