import React from 'react';

export const RiskBadge = ({ risk = 'LOW' }) => {
  const upper = String(risk).toUpperCase();

  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
  let dotColor = 'bg-emerald-600';

  if (upper.includes('HIGH') || upper.includes('CRITICAL')) {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200/90';
    dotColor = 'bg-rose-600';
  } else if (upper.includes('MEDIUM') || upper.includes('MODERATE')) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/90';
    dotColor = 'bg-amber-600';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
      {upper}
    </span>
  );
};

export default RiskBadge;
