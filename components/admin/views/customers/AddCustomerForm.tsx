'use client';

import React, { useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { SubscriberUser, DigitalProduct } from '@/lib/admin-data';
import {
  Card,
  formatBDT,
  getCredentialTypeLabel,
  SwitchToggle,
} from '@/components/admin/ui/primitives';

interface AddCustomerFormProps {
  products: DigitalProduct[];
  onBackToList: () => void;
  onAddCustomer: (newCustomer: SubscriberUser) => void;
}

export function AddCustomerForm({
  products,
  onBackToList,
  onAddCustomer,
}: AddCustomerFormProps) {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+880 17');
  const [newRole, setNewRole] = useState<SubscriberUser['role']>('subscriber');
  const [newStatus, setNewStatus] = useState<SubscriberUser['status']>('active');
  const [assignInitialPlan, setAssignInitialPlan] = useState(true);
  const [initialProdId, setInitialProdId] = useState<string>(products[0]?.id || '');
  const [initialVarId, setInitialVarId] = useState<string>(products[0]?.variants[0]?.id || '');

  const selectedInitialProd = products.find((p) => p.id === initialProdId) || products[0];
  const selectedInitialVar =
    selectedInitialProd?.variants.find((v) => v.id === initialVarId) ||
    selectedInitialProd?.variants[0];

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const initialSubs: SubscriberUser['activeSubscriptions'] = [];
    let initialSpend = 0;

    if (assignInitialPlan && selectedInitialProd && selectedInitialVar) {
      initialSpend = selectedInitialVar.priceBDT;
      initialSubs.push({
        id: `sub-${Date.now()}`,
        productName: selectedInitialProd.name,
        variantName: selectedInitialVar.name,
        credentialType: selectedInitialVar.credentialType,
        startedAt: '2026-10-30',
        expiresAt: '2026-11-29',
        remainingDays: selectedInitialVar.durationDays,
        autoRenew: true,
        warrantyActive: selectedInitialVar.hasWarranty,
      });
    }

    const created: SubscriberUser = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim() || '+880 1700-000000',
      joinedAt: '2026-10-30',
      status: newStatus,
      role: newRole,
      emailVerified: null,
      activeSubscriptions: initialSubs,
      totalSpentBDT: initialSpend,
      ordersCount: initialSubs.length,
      warrantyClaimsCount: 0,
    };

    onAddCustomer(created);
    setNewName('');
    setNewEmail('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600 text-slate-600 dark:text-slate-300 cursor-pointer"
            aria-label="Back to Customers"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Add Customer
          </h1>
        </div>
      </div>

      <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-7 p-5 space-y-4 text-xs">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            Customer Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Tariqul Islam"
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="tariqul.dev@gmail.com"
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+880 1711-000000"
                className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Tier
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as SubscriberUser['role'])}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="subscriber">Subscriber</option>
                <option value="vip">VIP</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SubscriberUser['status'])}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="active">Active</option>
                <option value="past_due">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onBackToList}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Customer</span>
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
              Add initial order
            </h2>
            <SwitchToggle
              checked={assignInitialPlan}
              onChange={setAssignInitialPlan}
              label="Add"
            />
          </div>

          {assignInitialPlan && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product
                </label>
                <select
                  value={initialProdId}
                  onChange={(e) => {
                    setInitialProdId(e.target.value);
                    const p = products.find((item) => item.id === e.target.value);
                    if (p && p.variants[0]) setInitialVarId(p.variants[0].id);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Option
                </label>
                <select
                  value={initialVarId}
                  onChange={(e) => setInitialVarId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  {selectedInitialProd?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {formatBDT(v.priceBDT)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedInitialVar && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {getCredentialTypeLabel(selectedInitialVar.credentialType)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {selectedInitialVar.durationDays}d
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Price</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(selectedInitialVar.priceBDT)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
