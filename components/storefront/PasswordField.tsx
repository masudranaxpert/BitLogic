'use client';

import React, { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id'
> & {
  label: string;
};

export function PasswordField({
  label,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field-control">
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          className={className}
        />
        <button
          type="button"
          className="password-toggle cursor-pointer"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff size={18} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
