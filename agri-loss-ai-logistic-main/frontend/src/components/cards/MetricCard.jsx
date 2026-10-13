import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  subtext,
  icon: Icon,
  color = 'primary',
  trend,
  trendPositive,
  className = '',
}) => {
  const displaySubtext = subtitle || subtext;

  const iconColorClass = {
    primary: 'text-[#075C36] bg-[#DDF3E4] border border-[#087443]/20',
    accent: 'text-[#946E13] bg-[#FCF9ED] border border-[#D6A72C]/40',
    danger: 'text-rose-700 bg-rose-50 border border-rose-200/80',
    info: 'text-sky-700 bg-sky-50 border border-sky-200/80',
  }[color] || 'text-[#075C36] bg-[#DDF3E4] border border-[#087443]/20';

  return (
    <div className={`bg-white p-4 sm:p-4.5 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between transition-all duration-150 hover:shadow-card hover:border-[#087443]/30 ${className}`}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider leading-snug break-words">
            {title}
          </p>
          <h3 className="text-2xl sm:text-[26px] font-extrabold text-stone-900 mt-1 tracking-tight tabular-nums break-words">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${iconColorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {(displaySubtext || trend) && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
          {displaySubtext && (
            <p className="text-stone-500 text-[11px] leading-tight truncate">{displaySubtext}</p>
          )}
          {trend && (
            <span
              className={`font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                trendPositive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                  : 'bg-rose-50 text-rose-800 border border-rose-200/80'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
