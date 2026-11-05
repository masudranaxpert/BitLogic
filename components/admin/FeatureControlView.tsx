'use client';

import React, { useState } from 'react';
import { Check, Save } from 'lucide-react';
import { SystemFeatureFlag } from '@/lib/admin-data';
import {
  Card,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
} from '@/components/ui/primitives';

interface FeatureControlViewProps {
  features: SystemFeatureFlag[];
  onToggleFeature: (id: string) => void;
}

export default function FeatureControlView({
  features,
  onToggleFeature,
}: FeatureControlViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [storeBannerText, setStoreBannerText] = useState(
    'Instant Auto-Vault Delivery Active 24/7. Use code BITLOGIC15 for 15% off.'
  );
  const [otpBotHandle, setOtpBotHandle] = useState('@BitLogicOTPVerifyBot');
  const [savedToast, setSavedToast] = useState(false);

  const filteredFeatures = features.filter((f) =>
    categoryFilter === 'all' ? true : f.category === categoryFilter
  );

  const handleSaveGlobalConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Settings
        </h1>
      </div>

      <SegmentedTabs
        options={[
          { value: 'all', label: 'All', count: features.length },
          { value: 'Fulfillment Engine', label: 'Fulfillment' },
          { value: 'Storefront & Stock UX', label: 'Storefront' },
          { value: 'Warranty & Security', label: 'Security' },
          { value: 'Payment & Webhooks', label: 'Payments' },
        ]}
        value={categoryFilter}
        onChange={setCategoryFilter}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map((flag) => (
          <Card key={flag.id} className="p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  {flag.key}
                </span>
                <StatusIndicator
                  tone={flag.enabled ? 'emerald' : 'zinc'}
                  label={flag.enabled ? 'Enabled' : 'Disabled'}
                />
              </div>

              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                {flag.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {flag.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{flag.impactNote}</span>
              <SwitchToggle
                checked={flag.enabled}
                onChange={() => onToggleFeature(flag.id)}
                label={flag.enabled ? 'Active' : 'Off'}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <form onSubmit={handleSaveGlobalConfig} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Storefront Configuration
            </h2>
            {savedToast && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Notice
              </label>
              <input
                type="text"
                value={storeBannerText}
                onChange={(e) => setStoreBannerText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                OTP Bot Handle
              </label>
              <input
                type="text"
                value={otpBotHandle}
                onChange={(e) => setOtpBotHandle(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
