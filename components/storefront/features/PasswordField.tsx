'use client';

import React, { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id'
> & {
  label: string;
  error?: string;
  invalid?: boolean;
};

export function PasswordField({
  label,
  className = '',
  error,
  invalid = false,
  required,
  ...inputProps
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const showError = Boolean(error) || invalid;

  return (
    <div className="password-field">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-slate-700"
      >
        {label}
        {required ? <span className="text-[#FF5E5B]"> *</span> : null}
      </label>
      <div
        className={`password-field-control relative${showError ? ' is-invalid' : ''}`}
      >
        <input
          {...inputProps}
          id={id}
          required={required}
          aria-invalid={showError || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          type={visible ? 'text' : 'password'}
          className={`w-full h-9.5 pl-3 pr-9 rounded-md border text-xs font-medium text-[#0F172A] focus:outline-none transition-colors ${
            showError
              ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-slate-200 focus:border-[#FF5E5B] focus:ring-2 focus:ring-[#FF5E5B]/15'
          } ${className}`}
        />
        <button
          type="button"
          className="password-toggle absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer border-0 bg-transparent"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff size={16} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Eye size={16} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-[11px] font-semibold text-rose-600 m-0"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
