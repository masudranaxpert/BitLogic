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
    <div className={`surface-card rounded-md ${className}`}>
      {children}
    </div>
  );
}
