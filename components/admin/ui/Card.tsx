'use client';

import React from 'react';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface-card rounded-[10px] ${className}`}>
      {children}
    </div>
  );
}
