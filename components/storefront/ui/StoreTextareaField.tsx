'use client';

import React, { type TextareaHTMLAttributes } from 'react';

type StoreTextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function StoreTextareaField({
  label,
  required,
  id,
  hint,
  error,
  className = '',
  rows = 4,
  ...rest
}: StoreTextareaFieldProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          {label} {required && <span className="text-[#FF5E5B]">*</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        required={required}
        className={`w-full px-3 py-2.5 rounded border ${
          error
            ? 'border-rose-500 focus:border-rose-600'
            : 'border-slate-300 focus:border-[#FF5E5B]'
        } bg-white text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors resize-y ${className}`}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-600 m-0">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 m-0">{hint}</p>
      ) : null}
    </div>
  );
}
