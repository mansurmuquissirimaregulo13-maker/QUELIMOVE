import * as React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon: Icon, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-[#9CA3AF]">{label}</label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] group-focus-within:text-[#FBBF24] transition-colors">
              <Icon size={20} />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#FBBF24] focus:border-[#FBBF24] transition-all
              ${Icon ? 'pl-12' : 'pl-4'} 
              ${className.includes('h-') ? '' : 'h-12'} 
              pr-4 ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';