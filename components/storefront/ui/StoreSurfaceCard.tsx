'use client';

import React from 'react';
import { StatusBadge, type StatusBadgeTone } from './StoreBadge';

type StoreSurfaceCardProps = {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export function StoreSurfaceCard({
  children,
  className = '',
  padded = true,
}: StoreSurfaceCardProps) {
  return (
    <div
      className={`bg-white rounded-md border border-slate-200/90 shadow-2xs ${
        padded ? 'p-4 sm:p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

type StoreStatCardProps = {
  label: string;
  value: React.ReactNode;
  badge?: string;
  tone?: StatusBadgeTone;
};

export function StoreStatCard({
  label,
  value,
  badge,
  tone = 'slate',
}: StoreStatCardProps) {
  return (
    <StoreSurfaceCard className="p-4">
      <span className="text-xs font-semibold text-slate-600 block">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">
          {value}
        </span>
        {badge && <StatusBadge tone={tone}>{badge}</StatusBadge>}
      </div>
    </StoreSurfaceCard>
  );
}
