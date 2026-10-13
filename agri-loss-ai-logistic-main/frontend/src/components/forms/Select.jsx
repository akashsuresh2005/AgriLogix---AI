import React from 'react';

export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-emerald-700 ml-0.5">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm bg-white text-stone-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed shadow-xs ${
          error ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-600' : 'border-stone-300 hover:border-stone-400'
        }`}
        {...props}
      >
        <option value="" disabled className="text-stone-400">
          {placeholder}
        </option>
        {options.map((opt, idx) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={idx} value={val} className="text-stone-800">
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-stone-500 mt-1">{helperText}</p>}
    </div>
  );
};

export default Select;
