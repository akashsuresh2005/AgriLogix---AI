import React, { useRef } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react';

export const DatePicker = ({
  label,
  value,
  onChange,
  max,
  min,
  required = false,
  error,
  helperText,
  className = '',
}) => {
  const inputRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const minDate = min !== undefined ? min : todayStr;
  const maxDate = max;

  // Format display text nicely
  const getDisplayText = () => {
    if (!value) return 'Select harvest date';
    const [y, m, d] = value.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dateObj - today) / (1000 * 60 * 60 * 24));
    const formatted = dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (diffDays === 0) return `Today (${formatted})`;
    if (diffDays === 1) return `Tomorrow (${formatted})`;
    if (diffDays > 1) return `${formatted} (in ${diffDays} days)`;
    return formatted;
  };

  const handleQuickSelect = (daysFromToday = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const dateStr = d.toISOString().split('T')[0];
    onChange({ target: { value: dateStr } });
  };

  const openNativePicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-emerald-700 ml-0.5">*</span>}
        </label>
      )}

      {/* Main Clickable Picker Container */}
      <div
        onClick={openNativePicker}
        className={`relative flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl shadow-xs cursor-pointer transition-all hover:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 ${
          error ? 'border-rose-400' : 'border-stone-300'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-sm font-semibold text-stone-900 block truncate">
              {getDisplayText()}
            </span>
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-600" />
              Click to choose calendar date
            </span>
          </div>
        </div>

        {/* Hidden or overlayed native input to support modern OS date pickers */}
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          max={maxDate}
          min={minDate}
          required={required}
          onChange={onChange}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          aria-label={label || 'Date picker'}
        />

        <div className="text-stone-400 hover:text-stone-600 pl-2">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Quick Select Preset Buttons for Farmer Convenience */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="text-[11px] font-medium text-stone-500 mr-1">Quick:</span>
        <button
          type="button"
          onClick={() => handleQuickSelect(0)}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            value === todayStr
              ? 'bg-[#075C36] text-white border-[#075C36] font-semibold shadow-xs'
              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-[#EAF4E6] hover:border-[#087443]/30'
          }`}
        >
          Today
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-stone-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default DatePicker;
