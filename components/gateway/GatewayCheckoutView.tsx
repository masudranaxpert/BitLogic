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
  ArrowRight,
  RefreshCw,
  Smartphone,
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
  const [step, setStep] = useState<1 | 2>(customerPhone ? 2 : 1);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(initialStatus === 'paid');
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const [showTrxModal, setShowTrxModal] = useState(false);
  const [manualTrxId, setManualTrxId] = useState('');
  const [submittingTrx, setSubmittingTrx] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 15-minute sliding countdown timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (isPaid) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Real-time Polling for Payment Verification
  useEffect(() => {
    if (isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/gateway/check/${orderId}`);
        const data = await res.json();
        if (data.isPaid) {
          setIsPaid(true);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [orderId, isPaid]);

  // Handle 2-second auto-redirect once paid
  useEffect(() => {
    if (!isPaid) return;
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push(`/account?order=${orderId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaid, orderId, router]);

  // Dynamic Theme Colors based on MFS Provider
  const theme = {
    bkash: {
      brand: '#D12053',
      headerBg: '#D12053',
      badgeBg: 'bg-[#D12053]/10',
      text: 'text-[#D12053]',
      name: 'bKash',
      number: settings.bkashNumber,
      type: settings.bkashType,
      icon: '/payments/bkash-icon.png',
    },
    nagad: {
      brand: '#F7941D',
      headerBg: '#EA1D25',
      badgeBg: 'bg-orange-50',
      text: 'text-[#EA1D25]',
      name: 'Nagad',
      number: settings.nagadNumber,
      type: settings.nagadType,
      icon: '/payments/nagad.png',
    },
    rocket: {
      brand: '#8C3494',
      headerBg: '#8C3494',
      badgeBg: 'bg-purple-50',
      text: 'text-[#8C3494]',
      name: 'Rocket',
      number: settings.rocketNumber,
      type: settings.rocketType,
      icon: '/payments/rocket.png',
    },
    upay: {
      brand: '#0057B8',
      headerBg: '#0057B8',
      badgeBg: 'bg-blue-50',
      text: 'text-[#0057B8]',
      name: 'Upay',
      number: settings.bkashNumber,
      type: 'Personal',
      icon: '/payments/bkash.svg',
    },
  }[method];

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(theme.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        body: JSON.stringify({ trxId: manualTrxId.trim(), senderNumber }),
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200/80 flex flex-col">
        {/* Gateway Provider Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
          <BrandLogo size="sm" />
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Invoice</div>
            <div className="font-mono text-xs font-bold text-slate-800">#{orderId}</div>
          </div>
        </div>

        {/* Amount & Items Header Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{itemsSummary}</div>
            <div className="text-[11px] text-slate-500">{customerEmail}</div>
          </div>
          <div className="font-mono text-lg font-black text-slate-900">
            ৳{totalBdt}
          </div>
        </div>

        {/* Provider Switcher Tabs */}
        <div className="grid grid-cols-4 p-2 gap-1.5 bg-slate-100/70 border-b border-slate-200/70">
          {(['bkash', 'nagad', 'rocket', 'upay'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setStep(2);
              }}
              className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                method === m
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="capitalize">{m}</span>
            </button>
          ))}
        </div>

        {/* MAIN BODY (Matching Uploaded Screen Reference) */}
        <div
          style={{ backgroundColor: theme.headerBg }}
          className="p-6 text-white flex-1 transition-colors duration-200 flex flex-col justify-between"
        >
          {step === 1 ? (
            /* STEP 1: Enter Sender Mobile Number */
            <div className="space-y-4 py-4 text-center">
              <h3 className="text-base font-bold text-white">Your {theme.name} Account Number</h3>
              <p className="text-xs text-white/80">
                Enter the mobile number you will pay from for instant automatic matching:
              </p>
              <div className="relative">
                <input
                  type="tel"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full h-11 rounded-xl bg-white px-4 text-center font-mono text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-10 rounded-xl bg-white font-bold text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                  style={{ color: theme.headerBg }}
                >
                  Confirm and Proceed
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Instructions, Merchant Number, Live Timer & Auto Verify */
            <div className="space-y-4 py-2">
              {/* Copyable Merchant/Personal Number Card */}
              <div className="rounded-xl bg-black/20 p-3 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {theme.type.toUpperCase()} ACCOUNT NUMBER
                  </div>
                  <div className="font-mono text-lg font-black tracking-wide text-white">
                    {theme.number}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="h-8 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Instructions steps with visuals */}
              <div className="space-y-2 text-xs text-white/95 leading-relaxed bg-black/10 p-3.5 rounded-xl border border-white/10">
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black" style={{ color: theme.headerBg }}>
                    1
                  </span>
                  <span>উপরের একাউন্ট নম্বর কপি করে আপনার {theme.name} অ্যাপে যান।</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black" style={{ color: theme.headerBg }}>
                    2
                  </span>
                  <span>
                    <strong>'Send Money'</strong> নির্বাচন করে <strong>৳{totalBdt}</strong> টাকা পাঠিয়ে দিন।
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black" style={{ color: theme.headerBg }}>
                    3
                  </span>
                  <span>টাকা পাঠানোর সাথে সাথে স্বয়ংক্রিয়ভাবে পেমেন্ট কনফার্ম হয়ে যাবে।</span>
                </div>
              </div>

              {/* Live Polling Status & Countdown */}
              <div className="py-2 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-white">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Waiting for payment...</span>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-[11px] font-mono text-white/90">
                  <Clock className="h-3 w-3" />
                  <span>
                    Expires in {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                </div>

                {/* Manual TrxID Link as requested */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTrxModal(true)}
                    className="text-xs font-semibold text-white/90 underline hover:text-white cursor-pointer bg-transparent border-0"
                  >
                    Not verified? Submit Txn ID
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Safe Guard */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span>100% Secure MFS Verification</span>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/account?order=${orderId}`)}
              className="text-white/80 hover:text-white underline cursor-pointer bg-transparent border-0"
            >
              Pay Later
            </button>
          </div>
        </div>
      </div>

      {/* MANUAL TrxID MODAL (Matching Uploaded Screenshot 5) */}
      {showTrxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            style={{ backgroundColor: theme.headerBg }}
            className="w-full max-w-[360px] rounded-2xl p-6 text-white shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-300" />
                <h4 className="font-bold text-sm">Payment Not Detected?</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTrxModal(false)}
                className="text-xs px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white border-0 cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-white/85 leading-relaxed">
              Enter your transaction ID from your payment provider SMS or app:
            </p>

            <form onSubmit={handleManualTrxSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={manualTrxId}
                onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                placeholder="e.g. DD08PXL5K8"
                className="w-full h-10 rounded-xl bg-white px-3 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />

              <div className="text-[11px] text-white/75 flex items-center justify-between">
                <span>Amount: ৳{totalBdt}</span>
                <span>Order: #{orderId}</span>
              </div>

              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    modalFeedback.type === 'ok' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-red-900/40 text-red-100'
                  }`}
                >
                  {modalFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingTrx}
                className="w-full h-10 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {submittingTrx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{submittingTrx ? 'Submitting...' : 'Submit Transaction ID'}</span>
              </button>
            </form>

            <p className="text-[10px] text-white/60 text-center">
              Add your Txn ID now — we'll verify your payment instantly or as soon as network delivers SMS.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
