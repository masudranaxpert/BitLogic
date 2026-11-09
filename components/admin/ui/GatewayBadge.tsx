'use client';

import React from 'react';
import { gatewayStyle } from '@/lib/admin/gateways';

export function GatewayBadge({
  gateway,
  size = 'md',
}: {
  gateway: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const g = gatewayStyle(gateway);
  const tile = size === 'sm' ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[10px]';
  const imgSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const norm = (gateway || '').trim().toLowerCase();

  const iconSrc =
    norm.includes('bkash')
      ? '/payments/bkash-icon.svg'
      : norm.includes('nagad')
      ? '/payments/nagad.svg'
      : norm.includes('rocket')
      ? '/payments/rocket.png'
      : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-2 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: g.bg, color: g.fg }}
    >
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-[5px] font-bold leading-none ${tile}`}
        style={{ backgroundColor: g.tile, color: g.tileFg }}
      >
        {iconSrc ? (
          <img src={iconSrc} alt="" className={`${imgSize} object-contain`} />
        ) : (
          g.mark
        )}
      </span>
      {g.name}
    </span>
  );
}
