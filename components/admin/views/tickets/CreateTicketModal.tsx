'use client';

import React, { useState } from 'react';
import {
  AdminSupportTicket,
  DigitalDelivery,
} from '@/lib/admin-data';
import { ModalShell } from '@/components/admin/ui/primitives';

interface CreateTicketModalProps {
  open: boolean;
  deliveries: DigitalDelivery[];
  onClose: () => void;
  onCreateTicket: (newTicket: {
    subject: string;
    orderId: string;
    category: AdminSupportTicket['category'];
    priority: AdminSupportTicket['priority'];
    initialMessage: string;
  }) => void;
}

export function CreateTicketModal({
  open,
  deliveries,
  onClose,
  onCreateTicket,
}: CreateTicketModalProps) {
  const [newSubject, setNewSubject] = useState('');
  const [newOrderId, setNewOrderId] = useState(deliveries[0]?.orderId || 'ORD-88219');
  const [newCategory, setNewCategory] =
    useState<AdminSupportTicket['category']>('Access & Delivery');
  const [newPriority, setNewPriority] =
    useState<AdminSupportTicket['priority']>('High');
  const [newMessage, setNewMessage] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    onCreateTicket({
      subject: newSubject.trim(),
      orderId: newOrderId,
      category: newCategory,
      priority: newPriority,
      initialMessage: newMessage.trim(),
    });
    setNewSubject('');
    setNewMessage('');
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Create Support Ticket"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Linked Order
          </label>
          <select
            value={newOrderId}
            onChange={(e) => setNewOrderId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            {deliveries.map((d) => (
              <option key={d.id} value={d.orderId}>
                {d.orderId} — {d.buyerName} ({d.productName})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as AdminSupportTicket['category'])
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              <option value="Access & Delivery">Access &amp; Delivery</option>
              <option value="Login / Credentials">Login / Credentials</option>
              <option value="Warranty / Replacement">Warranty / Replacement</option>
              <option value="Billing / TrxID">Billing / TrxID</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={newPriority}
              onChange={(e) =>
                setNewPriority(e.target.value as AdminSupportTicket['priority'])
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="e.g., Workspace invite verification follow-up"
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Message to Buyer
          </label>
          <textarea
            rows={4}
            required
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Write the support message..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
          >
            Create Ticket
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
