import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message, label = 'Loading application data...' }) => {
  const text = message || label;
  return (
    <div className="flex flex-col items-center justify-center p-12 text-stone-500">
      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-3">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-800" />
      </div>
      <p className="text-sm font-medium text-stone-600">{text}</p>
    </div>
  );
};

export default LoadingState;
