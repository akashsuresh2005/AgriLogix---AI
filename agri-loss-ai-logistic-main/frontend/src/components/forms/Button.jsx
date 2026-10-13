import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  isLoading = false,
  onClick,
  className = '',
}) => {
  const isBusy = loading || isLoading;

  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-xs active:scale-[0.98]';

  const variantClasses = {
    primary:
      'bg-[#075C36] hover:bg-[#087443] text-white focus:ring-[#075C36] shadow-xs border border-[#075C36]/50',
    secondary:
      'bg-white border border-[#D5E2D2] text-[#17251B] hover:bg-[#EAF4E6] hover:text-[#075C36] focus:ring-[#087443]',
    outline:
      'bg-white border border-[#D5E2D2] text-[#17251B] hover:bg-[#EAF4E6] hover:border-[#087443]/40 hover:text-[#075C36] focus:ring-[#087443]',
    harvest:
      'bg-[#D6A72C] hover:bg-[#B88B1E] text-[#17251B] font-semibold focus:ring-[#D6A72C] shadow-xs border border-[#D6A72C]/40',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-600 shadow-xs',
    ghost:
      'bg-transparent hover:bg-[#EAF4E6] text-[#17251B] hover:text-[#075C36] focus:ring-[#087443] shadow-none',
  }[variant] || 'bg-[#075C36] hover:bg-[#087443] text-white focus:ring-[#075C36]';

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs rounded-lg',
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size] || 'px-4 py-2 text-sm';

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
    >
      {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />}
      {children}
    </button>
  );
};

export default Button;
