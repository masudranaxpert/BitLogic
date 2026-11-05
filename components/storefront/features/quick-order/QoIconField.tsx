import React, { type InputHTMLAttributes, type ReactNode } from 'react';

type QoIconFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  requiredMark?: boolean;
};

export function QoIconField({
  label,
  icon,
  requiredMark,
  id,
  ...inputProps
}: QoIconFieldProps) {
  const fieldId = id ?? inputProps.name;
  return (
    <label className="qo-field" htmlFor={fieldId}>
      <span className="qo-field-label">
        {label}
        {requiredMark ? <em aria-hidden="true">*</em> : null}
      </span>
      <span className="qo-field-control">
        <span className="qo-field-icon" aria-hidden="true">
          {icon}
        </span>
        <input id={fieldId} {...inputProps} />
      </span>
    </label>
  );
}
