'use client';

import React, { createContext, useContext } from 'react';

const LogoUrl = createContext('');

/** Empty logoUrl keeps the built-in lockup in public/brand. */
export function BrandProvider({
  logoUrl,
  children,
}: {
  logoUrl: string;
  children: React.ReactNode;
}) {
  return <LogoUrl.Provider value={logoUrl}>{children}</LogoUrl.Provider>;
}

export function BrandLogo({
  size = 'md',
  mark = false,
  subtitle,
  className = '',
}: {
  size?: 'sm' | 'md';
  /** Padlock only. Default is the horizontal lockup. */
  mark?: boolean;
  /** Small line under the lockup (e.g. "Admin"). */
  subtitle?: string;
  className?: string;
}) {
  const custom = useContext(LogoUrl);
  const h = size === 'sm' ? 'h-7' : 'h-9';
  if (mark) {
    return <img src="/brand/mark.svg" alt="Blumartbd" className={`${h} w-auto ${className}`} />;
  }
  if (custom) {
    return (
      <span className={`inline-flex flex-col items-start leading-none ${className}`}>
        <img src={custom} alt="Blumartbd" className={`${h} w-auto`} />
        {subtitle ? (
          <span className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 select-none">
            {subtitle}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`}>
      <img src="/brand/logo.svg" alt="Blumartbd" className={`${h} w-auto dark:hidden`} />
      <img src="/brand/logo-dark.svg" alt="Blumartbd" className={`${h} hidden w-auto dark:block`} />
      {subtitle ? (
        <span className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 select-none">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
