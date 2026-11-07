import React from 'react';

/** The Bitlogic mark used in the storefront header — one source for store and admin. */
export function BrandLogo({
  size = 'md',
  subtitle,
  className = '',
}: {
  size?: 'sm' | 'md';
  /** Small line under the wordmark (e.g. "Admin"). */
  subtitle?: string;
  className?: string;
}) {
  const tile = size === 'sm' ? 'h-8 w-8 text-sm rounded-xl' : 'h-9 w-9 text-base rounded-2xl';
  const word = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className={`${tile} inline-flex shrink-0 rotate-[-4deg] items-center justify-center bg-[#FF5E5B] font-extrabold text-white shadow-md shadow-[#FF5E5B]/25`}
      >
        B
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display ${word} font-extrabold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap`}>
          Bit<span className="text-[#FF5E5B]">logic</span>
        </span>
        {subtitle ? (
          <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
