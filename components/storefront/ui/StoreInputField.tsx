'use client';

import React, { type ComponentType, type InputHTMLAttributes } from 'react';

type IconComponent = ComponentType<{ size?: number; className?: string }>;

type StoreInputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: IconComponent;
  mono?: boolean;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
};

export function StoreInputField({
  label,
  icon: Icon,
  mono = false,
  required,
  id,
  error,
  hint,
  rightElement,
  disabled,
  className = '',
  ...rest
}: StoreInputFieldProps) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label
            htmlFor={id}
            className="block text-xs font-semibold text-slate-700"
          >
            {label} {required && <span className="text-[#FF5E5B]">*</span>}
          </label>
          {rightElement}
        </div>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
        )}
        <input
          id={id}
          required={required}
          disabled={disabled}
          className={`w-full h-9.5 ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          } rounded border ${
            error
              ? 'border-rose-500 focus:border-rose-600'
              : 'border-slate-300 focus:border-[#FF5E5B]'
          } ${
            disabled
              ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none'
              : 'bg-white text-slate-900'
          } text-[13px] ${
            mono ? 'font-mono placeholder:font-sans' : 'font-medium'
          } placeholder:text-slate-400 focus:outline-none transition-colors ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-600 m-0">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 m-0">{hint}</p>
      ) : null}
    </div>
  );
}
