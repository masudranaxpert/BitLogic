'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Smartphone,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export type GatewayCheckoutProps = {
  orderId: string;
  initialMethod: 'bkash' | 'nagad' | 'rocket' | 'upay';
  totalBdt: number;
  itemsSummary: string;
  paymentStatus: string;
  customerEmail: string;
  customerPhone?: string;
  settings: {
    bkashNumber: string;
    bkashType: string;
    nagadNumber: string;
    nagadType: string;
    rocketNumber: string;
    rocketType: string;
  };
};

export function GatewayCheckoutView({
  orderId,
  initialMethod = 'bkash',
  totalBdt,
  itemsSummary,
  paymentStatus: initialStatus,
  customerEmail,
  customerPhone,
  settings,
}: GatewayCheckoutProps) {
  const router = useRouter();
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'upay'>(initialMethod);
  const [senderNumber, setSenderNumber] = useState(customerPhone || '');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isPaid, setIsPaid] = useState(initialStatus === 'paid');
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const [showTrxModal, setShowTrxModal] = useState(false);
  const [manualTrxId, setManualTrxId] = useState('');
  const [submittingTrx, setSubmittingTrx] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 15-minute sliding countdown timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (isPaid || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaid, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Active polling to check if payment received via Android Sync APK
  useEffect(() => {
    if (isPaid) return;
    let timer: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/gateway/check/${orderId}?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'paid') {
            setIsPaid(true);
            return;
          }
        }
      } catch {
        // silent polling failure
      }
      timer = setTimeout(poll, 3000);
    };

    timer = setTimeout(poll, 3000);
    return () => clearTimeout(timer);
  }, [orderId, isPaid]);

  // 2-second automatic redirect on success
  useEffect(() => {
    if (!isPaid) return;
    const interval = setInterval(() => {
      setRedirectCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push(`/account?order=${orderId}&paid=1`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaid, orderId, router]);

  const getMethodTheme = () => {
    switch (method) {
      case 'nagad':
        return {
          name: 'Nagad',
          icon: '/payments/nagad.svg',
          color: '#EA580C',
          bgColor: '#FFF7ED',
          number: settings.nagadNumber || '018XXXXXXXX',
          type: settings.nagadType || 'Personal',
        };
      case 'rocket':
        return {
          name: 'Rocket',
          icon: '/payments/rocket.png',
          color: '#8B5CF6',
          bgColor: '#FAF5FF',
          number: settings.rocketNumber || '01XXXXXXXXX-X',
          type: settings.rocketType || 'Personal',
        };
      case 'bkash':
      default:
        return {
          name: 'bKash',
          icon: '/payments/bkash-icon.svg',
          color: '#E11D48',
          bgColor: '#FFF1F2',
          number: settings.bkashNumber || '017XXXXXXXX',
          type: settings.bkashType || 'Personal',
        };
    }
  };

  const theme = getMethodTheme();

  const handleCopy = (text: string, type: 'number' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'number') {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const handleManualTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTrxId.trim()) return;
    setSubmittingTrx(true);
    setModalFeedback(null);

    try {
      const res = await fetch(`/api/gateway/check/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trxId: manualTrxId.trim(),
          senderNumber: senderNumber.trim(),
          gateway: theme.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaid(true);
        setShowTrxModal(false);
      } else {
        setModalFeedback({ type: 'err', text: data.message || 'Verification in progress...' });
      }
    } catch (e: any) {
      setModalFeedback({ type: 'err', text: e.message || 'Network error' });
    } finally {
      setSubmittingTrx(false);
    }
  };

  // SUCCESS SCREEN
  if (isPaid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-900">Payment Successful!</h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Your payment of <strong className="text-slate-900">৳{totalBdt}</strong> has been confirmed.
          </p>

          <div className="mt-6 rounded-xl bg-slate-900 p-4 text-white">
            <p className="text-xs text-slate-300">Redirecting to order delivery in</p>
            <div className="mt-1 font-mono text-3xl font-black text-emerald-400">
              {redirectCountdown} <span className="text-sm font-normal text-slate-400">SECONDS</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">Please do not close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-[500px] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-700">Checkout</span>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Due</div>
            <div className="font-mono text-base font-black text-slate-900">৳{totalBdt} BDT</div>
          </div>
        </div>

        {/* Order Details Accordion/Summary */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 truncate max-w-[300px]">
            <span className="font-semibold text-slate-900 truncate">{itemsSummary}</span>
            <span className="text-slate-400">({orderId})</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 shrink-0">
            {minutes}m {seconds}s left
          </span>
        </div>

        {/* Provider Switcher Tabs (Paymently / ZiniPay Reference Style) */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Payment Options
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['bkash', 'nagad', 'rocket'] as const).map((m) => {
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`h-12 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={m === 'bkash' ? '/payments/bkash-icon.svg' : m === 'nagad' ? '/payments/nagad.svg' : '/payments/rocket.png'}
                    alt={m}
                    className="h-5 w-auto object-contain"
                  />
                  <span className="capitalize">{m}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN PAYMENT INSTRUCTION & NUMBER BOX */}
        <div className="p-6 space-y-4">
          {/* Instruction Pill */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
            Open your <strong>{theme.name}</strong> app, choose <strong>Send Money</strong>, then send exactly{' '}
            <strong className="font-mono font-bold text-slate-900">৳{totalBdt} BDT</strong>.
          </div>

          {/* Account Number Box with Copy */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                SEND MONEY TO THIS NUMBER ({theme.type.toUpperCase()})
              </div>
              <div className="font-mono text-lg font-black text-slate-900 tracking-wide mt-0.5">
                {theme.number}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(theme.number, 'number')}
              className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNumber ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Amount Box with Copy */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                SEND EXACTLY
              </div>
              <div className="font-mono text-lg font-black text-indigo-600 tracking-wide mt-0.5">
                {totalBdt} BDT
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(String(totalBdt), 'amount')}
              className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Live Automatic Detection Status */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600" />
              </span>
              <span className="font-bold text-indigo-950">Waiting for your payment...</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-indigo-600">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} left
            </span>
          </div>

          <div className="text-center pt-1 space-y-1">
            <p className="text-[11px] text-slate-500">
              Please wait. Your payment will be verified automatically.
            </p>
            <p className="text-[11px] text-slate-500">
              Taking too long to verify?{' '}
              <button
                type="button"
                onClick={() => setShowTrxModal(true)}
                className="font-bold text-indigo-600 underline hover:text-indigo-800 cursor-pointer border-0 bg-transparent p-0"
              >
                Submit {theme.name} Transaction ID
              </button>
            </p>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-medium">Secured with 256-bit encryption</span>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/account?order=${orderId}`)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Cancel and return
          </button>
        </div>
      </div>

      {/* Manual TrxID Input Modal */}
      {showTrxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-900">Submit Transaction ID</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTrxModal(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the transaction ID received in your {theme.name} confirmation SMS:
            </p>

            <form onSubmit={handleManualTrxSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={manualTrxId}
                onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                placeholder="e.g. DD08PXL5K8"
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Amount: ৳{totalBdt}</span>
                <span>Order: #{orderId}</span>
              </div>

              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium ${
                    modalFeedback.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {modalFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingTrx}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
              >
                {submittingTrx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{submittingTrx ? 'Submitting...' : 'Confirm & Verify'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
