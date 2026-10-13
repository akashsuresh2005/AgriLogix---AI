import React from 'react';

export const StatusBadge = ({ status = 'In Transit' }) => {
  const statusColors = {
    'In Transit': 'bg-sky-50 text-sky-800 border-sky-200/90',
    'In Storage': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
    'Listed (Accelerated)': 'bg-amber-50 text-amber-800 border-amber-200/90',
    'Listed (Standard Mandi)': 'bg-purple-50 text-purple-800 border-purple-200/90',
    'Awaiting Buyer Pickup Confirmation': 'bg-orange-50 text-orange-800 border-orange-200/90',
    'Redirected': 'bg-rose-50 text-rose-800 border-rose-200/90',
    'Delivered': 'bg-stone-100 text-stone-700 border-stone-300',
    'Active': 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
  };

  const classes = statusColors[status] || 'bg-stone-50 text-stone-700 border-stone-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
