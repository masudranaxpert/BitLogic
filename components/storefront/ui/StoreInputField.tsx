'use client';

import React, { useId, type ComponentType, type InputHTMLAttributes } from 'react';

type IconComponent = ComponentType<{ size?: number; className?: string }>;

type StoreInputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: IconComponent;
  mono?: boolean;
  error?: string;
  invalid?: boolean;
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
  invalid = false,
  hint,
  rightElement,
  disabled,
  className = '',
  ...rest
}: StoreInputFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const showInvalid = Boolean(error) || invalid;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label
            htmlFor={fieldId}
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
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              showInvalid ? 'text-rose-500' : 'text-slate-500'
            }`}
          />
        )}
        <input
          id={fieldId}
          required={required}
          disabled={disabled}
          aria-invalid={showInvalid || undefined}
          className={`w-full h-9.5 ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          } rounded border ${
            showInvalid
              ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-slate-300 focus:border-[#FF5E5B]'
          } ${
            disabled
              ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none'
              : showInvalid
                ? ''
                : 'bg-white text-slate-900'
          } text-[13px] ${
            mono ? 'font-mono placeholder:font-sans' : 'font-medium'
          } placeholder:text-slate-400 focus:outline-none transition-colors ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] font-semibold text-rose-600 m-0" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 m-0">{hint}</p>
      ) : null}
    </div>
  );
}
