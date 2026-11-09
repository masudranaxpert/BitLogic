'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  WifiOff,
  ShieldCheck,
  KeyRound,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export type GatewayMethod = 'bkash' | 'nagad' | 'rocket';

export type GatewayCheckoutProps = {
  orderId: string;
  initialMethod: GatewayMethod;
  totalBdt: number;
  itemsSummary: string;
  paymentStatus: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  registeredSenderNumber?: string;
  settings: {
    bkashEnabled: boolean;
    bkashNumber: string;
    bkashType: string;
    nagadEnabled: boolean;
    nagadNumber: string;
    nagadType: string;
    rocketEnabled: boolean;
    rocketNumber: string;
    rocketType: string;
    verifyModeTrxId: boolean;
    verifyModeSenderFifo: boolean;
    verifyModeReference: boolean;
  };
};

export function GatewayCheckoutView({
  orderId,
  initialMethod = 'bkash',
  totalBdt,
  itemsSummary,
  paymentStatus: initialStatus,
  customerPhone,
  registeredSenderNumber,
  settings,
}: GatewayCheckoutProps) {
  const router = useRouter();

  // Strictly enabled methods from Admin
  const enabledMethods: GatewayMethod[] = [];
  if (settings.bkashEnabled) enabledMethods.push('bkash');
  if (settings.nagadEnabled) enabledMethods.push('nagad');
  if (settings.rocketEnabled) enabledMethods.push('rocket');
  if (enabledMethods.length === 0) enabledMethods.push('bkash');

  const safeInitialMethod = enabledMethods.includes(initialMethod)
    ? initialMethod
    : enabledMethods[0];

  const [method, setMethod] = useState<GatewayMethod>(safeInitialMethod);

  // Strict TrxID Only mode check
  const isStrictTrxOnly =
    settings.verifyModeTrxId &&
    !settings.verifyModeSenderFifo &&
    !settings.verifyModeReference;

  const hasRegisteredValidSender = Boolean(
    registeredSenderNumber &&
      /^01\d{9}$/.test(registeredSenderNumber.replace(/\D/g, '').slice(-11))
  );

  const [step, setStep] = useState<'sender_input' | 'payment_instructions'>(
    hasRegisteredValidSender || isStrictTrxOnly ? 'payment_instructions' : 'sender_input'
  );

  const [senderNumber, setSenderNumber] = useState(
    registeredSenderNumber || customerPhone || ''
  );
  const [senderError, setSenderError] = useState('');
  const [submittingSender, setSubmittingSender] = useState(false);

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedInv, setCopiedInv] = useState(false);

  const [isPaid, setIsPaid] = useState(initialStatus === 'paid');
  const [redirectCountdown, setRedirectCountdown] = useState(2);

  const [showTrxModal, setShowTrxModal] = useState(false);
  const [manualTrxId, setManualTrxId] = useState('');
  const [submittingTrx, setSubmittingTrx] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [isOffline, setIsOffline] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/gateway/check/${orderId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          setIsOffline(false);
          const data = await res.json();
          if (data.status === 'paid') {
            setIsPaid(true);
            return;
          }
        }
      } catch {
        // Silent retry on temporary network hiccup
      }
      if (!cancelled) {
        timer = setTimeout(poll, 2500);
      }
    };

    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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

  const getMethodTheme = (m: GatewayMethod = method) => {
    switch (m) {
      case 'nagad':
        return {
          id: 'nagad' as const,
          name: 'Nagad',
          bnName: 'নগদ',
          icon: '/payments/nagad.svg',
          guideImg: '/payments/guides/nagad-guide.jpg',
          guideViewBox: '0 0 487 162',
          circleCx: '68',
          circleCy: '82',
          arrowPath: 'M 220 28 Q 145 25 108 60',
          arrowHead: '98,70 105,49 120,62',
          brandBg: '#E3262E',
          brandDarkBg: '#B81B22',
          number: settings.nagadNumber || '01700-123456',
          type: settings.nagadType || 'Personal',
        };
      case 'rocket':
        return {
          id: 'rocket' as const,
          name: 'Rocket',
          bnName: 'রকেট',
          icon: '/payments/rocket.png',
          guideImg: '/payments/guides/rocket-guide.jpg',
          guideViewBox: '0 0 487 162',
          circleCx: '68',
          circleCy: '95',
          arrowPath: 'M 225 35 Q 145 32 108 72',
          arrowHead: '98,82 105,61 120,74',
          brandBg: '#7E22CE',
          brandDarkBg: '#581C87',
          number: settings.rocketNumber || '01700-123456',
          type: settings.rocketType || 'Personal',
        };
      case 'bkash':
      default:
        return {
          id: 'bkash' as const,
          name: 'bKash',
          bnName: 'বিকাশ',
          icon: '/payments/bkash-icon.svg',
          guideImg: '/payments/guides/bkash-guide.jpg',
          guideViewBox: '0 0 487 205',
          circleCx: '64',
          circleCy: '126',
          arrowPath: 'M 235 38 Q 145 36 105 92',
          arrowHead: '95,103 103,80 118,95',
          brandBg: '#D12053',
          brandDarkBg: '#A6153F',
          number: settings.bkashNumber || '01700-123456',
          type: settings.bkashType || 'Personal',
        };
    }
  };

  const theme = getMethodTheme();

  const handleCopy = (text: string, type: 'number' | 'amount' | 'inv') => {
    navigator.clipboard.writeText(text);
    if (type === 'number') {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else {
      setCopiedInv(true);
      setTimeout(() => setCopiedInv(false), 2000);
    }
  };

  const handleConfirmSenderNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenderError('');
    const digits = senderNumber.replace(/\D/g, '');
    const normalized = digits.length >= 11 ? digits.slice(-11) : digits;

    if (!/^01\d{9}$/.test(normalized)) {
      setSenderError('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01XXXXXXXXX)');
      return;
    }

    setSubmittingSender(true);
    try {
      const res = await fetch(`/api/gateway/check/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_sender',
          senderNumber: normalized,
          gateway: theme.name,
        }),
      });
      const data = await res.json();
      setSenderNumber(normalized);

      if (data.success && data.matchedBy) {
        setIsPaid(true);
        return;
      }
      setStep('payment_instructions');
    } catch {
      setSenderNumber(normalized);
      setStep('payment_instructions');
    } finally {
      setSubmittingSender(false);
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
          trxId: manualTrxId.trim().toUpperCase(),
          senderNumber: senderNumber.trim(),
          gateway: theme.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaid(true);
        setShowTrxModal(false);
      } else {
        setModalFeedback({
          type: 'err',
          text: data.message || 'পেমেন্ট এসএমএস পাওয়া মাত্রই অটোমেটিক ভেরিফাই হবে।',
        });
      }
    } catch {
      setModalFeedback({
        type: 'err',
        text: 'নেটওয়ার্ক কানেকশন চেক করুন এবং আবার চেষ্টা করুন।',
      });
    } finally {
      setSubmittingTrx(false);
    }
  };

  // ============================================================================
  // STEP 3: AUTHENTIC BRANDED PAYMENT SUCCESSFUL SCREEN
  // ============================================================================
  if (isPaid) {
    return (
      <div className="min-h-screen bg-[#ECEEF1] flex items-center justify-center p-3 sm:p-6 font-sans">
        <div className="w-full max-w-[440px] overflow-hidden rounded-lg bg-white shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200">
          <div className="py-5 px-6 flex items-center justify-center border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5">
              <img
                src={theme.icon}
                alt={theme.name}
                className="h-9 w-auto object-contain"
              />
              <span className="text-xl font-black tracking-tight text-slate-900">
                {theme.name}
              </span>
            </div>
          </div>

          <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">
                  Blumartbd
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  Inv No: {orderId}
                </div>
              </div>
            </div>
            <div className="font-mono text-xl font-black text-slate-800 shrink-0">
              ৳{totalBdt}
            </div>
          </div>

          <div
            className="px-6 py-10 text-center text-white space-y-5"
            style={{ backgroundColor: theme.brandBg }}
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
              <Check
                className="w-9 h-9 stroke-[3.5]"
                style={{ color: theme.brandBg }}
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight text-white">
                Payment Successful
              </h2>
              <p className="text-xs font-medium text-white/90">
                Your payment of <strong className="font-black">৳{totalBdt}</strong> has been confirmed.
              </p>
            </div>

            <div
              className="rounded-md p-5 border border-white/20 mx-auto max-w-[340px]"
              style={{ backgroundColor: theme.brandDarkBg }}
            >
              <p className="text-xs font-semibold text-white/85">
                Redirecting to merchant website in
              </p>
              <div className="mt-1 font-mono text-3xl font-black text-white">
                {redirectCountdown}
              </div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-white/75 mt-0.5">
                SECONDS
              </div>
            </div>

            <p className="text-xs font-medium text-white/80 pt-1">
              Please do not close this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECEEF1] flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      {isOffline && (
        <div className="w-full max-w-[440px] mb-3 rounded-md bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>ইন্টারনেট সংযোগ বিচ্ছিন্ন। সংযোগ ফিরলে পেমেন্ট স্বয়ংক্রিয়ভাবে যাচাই হবে।</span>
          </div>
        </div>
      )}

      {/* Main ZiniPay / Official bKash Card */}
      <div className="w-full max-w-[440px] overflow-hidden rounded-lg bg-white shadow-2xl border border-slate-200/90 flex flex-col">
        {/* Top Bar: Method Switcher */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push(`/account?order=${orderId}`)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-transparent border-0 cursor-pointer p-1"
            title="Back to Order"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {enabledMethods.length > 1 ? (
            <div className="flex items-center gap-1.5">
              {enabledMethods.map((m) => {
                const mTheme = getMethodTheme(m);
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`h-8 px-2.5 rounded-md border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'border-slate-900 bg-white text-slate-900 shadow-2xs ring-1 ring-slate-900'
                        : 'border-slate-200/90 bg-white/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <img
                      src={mTheme.icon}
                      alt={mTheme.name}
                      className="h-4 w-auto object-contain"
                    />
                    <span>{mTheme.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secure Checkout</span>
            </div>
          )}
        </div>

        {/* Official Brand Logo Header */}
        <div className="py-3.5 px-6 flex items-center justify-center border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <img
              src={theme.icon}
              alt={theme.name}
              className="h-9 w-auto object-contain"
            />
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {theme.name}
            </span>
          </div>
        </div>

        {/* Product / Merchant & Invoice Info Bar */}
        <div className="px-5 py-3 bg-white flex items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {itemsSummary || 'Blumartbd Order'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono text-slate-500 truncate">
                  Inv No: {orderId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(orderId, 'inv')}
                  className="text-slate-400 hover:text-slate-700 bg-transparent border-0 p-0.5 cursor-pointer"
                  title="Copy Invoice ID"
                >
                  {copiedInv ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" style={{ color: theme.brandBg }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="font-mono text-xl font-black text-slate-800 shrink-0 tabular-nums">
            ৳{totalBdt}
          </div>
        </div>

        {/* ========================================================================
            STEP 1: SENDER ACCOUNT NUMBER INPUT
           ======================================================================== */}
        {step === 'sender_input' ? (
          <form onSubmit={handleConfirmSenderNumber} className="flex flex-col">
            <div
              className="px-6 py-11 text-center text-white space-y-4"
              style={{ backgroundColor: theme.brandBg }}
            >
              <label
                htmlFor="mfs-sender-input"
                className="block text-base font-bold text-white tracking-wide"
              >
                Your {theme.name} Account Number
              </label>

              <p className="text-xs text-white/85 max-w-[320px] mx-auto leading-relaxed">
                আপনি যে {theme.bnName} নাম্বার থেকে টাকা পাঠাবেন সেই ১১ ডিজিটের নাম্বারটি দিন
              </p>

              <div className="max-w-[340px] mx-auto">
                <input
                  id="mfs-sender-input"
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  required
                  maxLength={14}
                  value={senderNumber}
                  onChange={(e) => {
                    setSenderNumber(e.target.value);
                    if (senderError) setSenderError('');
                  }}
                  placeholder="e.g 01XXXXXXXXX"
                  className="w-full h-11 rounded-md bg-white px-4 text-center font-mono text-base font-bold text-slate-900 placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 border-2 border-white focus:outline-none focus:ring-4 focus:ring-black/15 shadow-inner"
                />
              </div>

              {senderError ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/25 text-white text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{senderError}</span>
                </div>
              ) : (
                <p className="text-xs font-semibold text-white/90 pt-1">
                  Confirm and proceed,{' '}
                  <span className="underline opacity-90">terms &amp; conditions</span>
                </p>
              )}
            </div>

            {/* Bottom Cancel / Confirm Buttons */}
            <div className="p-4 bg-white grid grid-cols-2 gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push(`/account?order=${orderId}`)}
                className="h-10 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingSender}
                style={{ backgroundColor: theme.brandBg }}
                className="h-10 rounded-md text-white font-bold text-xs hover:opacity-95 transition-opacity cursor-pointer border-0 flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {submittingSender ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================
             STEP 2: BENGALI INSTRUCTIONS + COMPACT REAL APP ROW + WAITING
             ======================================================================== */
          <div className="flex flex-col">
            <div
              className="p-5 text-white space-y-3"
              style={{ backgroundColor: theme.brandBg }}
            >
              {/* Registered Sender Pill with Change button */}
              {!isStrictTrxOnly && senderNumber && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-black/15 text-xs">
                  <span className="text-white/90">
                    প্রেরক নাম্বার: <strong className="font-mono">{senderNumber}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('sender_input')}
                    className="text-[11px] font-bold text-white underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    পরিবর্তন করুন
                  </button>
                </div>
              )}

              {/* Copyable Merchant / Personal Number Box */}
              <div
                className="rounded-md p-3.5 border border-white/30 flex items-center justify-between gap-3"
                style={{ backgroundColor: theme.brandDarkBg }}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                    {theme.type === 'Personal' ? 'PERSONAL NUMBER' : 'MERCHANT NUMBER'} (সেন্ড মানি করুন)
                  </div>
                  <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-wide mt-0.5 select-all">
                    {theme.number}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(theme.number, 'number')}
                  className="h-9 px-3 rounded-md bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/25 transition-colors cursor-pointer shrink-0"
                >
                  {copiedNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Amount Copy Strip right below Number Box (Restored as requested) */}
              <div className="rounded-md px-3.5 py-2.5 bg-black/15 border border-white/15 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/85">পাঠাতে হবে (Send Exactly): </span>
                  <strong className="font-mono text-sm font-black text-white">৳{totalBdt}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(String(totalBdt), 'amount')}
                  className="h-7 px-2.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold border border-white/20 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  {copiedAmount ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy ৳{totalBdt}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step-by-Step Bengali Instructions + Compact Real App Icon Strip */}
              <div className="space-y-2 text-xs font-semibold text-white pt-0.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-5 h-5 rounded-full bg-white text-xs font-black flex items-center justify-center shrink-0"
                    style={{ color: theme.brandBg }}
                  >
                    1
                  </span>
                  <span>
                    উপরের {theme.type === 'Personal' ? 'পার্সোনাল' : theme.type} অ্যাকাউন্ট নম্বর কপি করুন
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className="w-5 h-5 rounded-full bg-white text-xs font-black flex items-center justify-center shrink-0"
                    style={{ color: theme.brandBg }}
                  >
                    2
                  </span>
                  <span>
                    {theme.bnName} অ্যাপ এ যান তারপর &lsquo;সেন্ড মানি&rsquo; নির্বাচন করুন
                  </span>
                </div>

                {/* Compact Real Cropped Icon Row (No Personal Name/Header Shown) */}
                <div className="relative rounded-md overflow-hidden bg-white shadow-md border border-white/40 mx-1 my-1">
                  <img
                    src={theme.guideImg}
                    alt={`${theme.name} Send Money Guide`}
                    className="w-full h-auto block select-none"
                  />

                  <svg
                    viewBox={theme.guideViewBox}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    fill="none"
                  >
                    <circle
                      cx={theme.circleCx}
                      cy={theme.circleCy}
                      r="50"
                      stroke="#FACC15"
                      strokeWidth="4"
                      strokeDasharray="7 5"
                      fill="rgba(250, 204, 21, 0.14)"
                    />
                    <path
                      d={theme.arrowPath}
                      stroke="#FACC15"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <polygon points={theme.arrowHead} fill="#FACC15" />
                  </svg>
                </div>

                <div className="flex items-center gap-2.5 pt-0.5">
                  <span
                    className="w-5 h-5 rounded-full bg-white text-xs font-black flex items-center justify-center shrink-0"
                    style={{ color: theme.brandBg }}
                  >
                    3
                  </span>
                  <span>
                    অ্যাকাউন্ট নম্বর পেস্ট করুন এবং <strong>৳{totalBdt}</strong> সেন্ড মানি করুন।
                  </span>
                </div>
              </div>

              {/* Strict TrxID Only Mode Inline Input OR Live Waiting Bar */}
              {isStrictTrxOnly ? (
                <form
                  onSubmit={handleManualTrxSubmit}
                  className="pt-2 space-y-2 border-t border-white/20"
                >
                  <label className="block text-xs font-bold text-white">
                    সেন্ড মানি করার পর আপনার {theme.name} Transaction ID (TrxID) টি নিচে দিন:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={manualTrxId}
                      onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                      placeholder="যেমন: BI829384KL"
                      className="flex-1 h-10 rounded-md bg-white px-3 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 border-0 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingTrx}
                      className="h-10 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border-0 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {submittingTrx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Verify</span>
                    </button>
                  </div>
                  {modalFeedback && (
                    <p className="text-[11px] font-bold text-amber-200 m-0">
                      {modalFeedback.text}
                    </p>
                  )}
                </form>
              ) : (
                <div
                  className="rounded-md px-4 py-2.5 flex items-center justify-between border border-white/20"
                  style={{ backgroundColor: theme.brandDarkBg }}
                >
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-xs font-extrabold tracking-wide text-white">
                      Waiting for payment...
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-white/90 tabular-nums">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Clean Structured White Action Footer */}
            {!isStrictTrxOnly && (
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/account?order=${orderId}`)}
                    className="h-9.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalFeedback(null);
                      setShowTrxModal(true);
                    }}
                    className="h-9.5 rounded-md border border-slate-300 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>TrxID দিয়ে ভেরিফাই</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual TrxID Fallback Modal */}
      {showTrxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-[380px] rounded-lg bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <img src={theme.icon} alt={theme.name} className="h-5 w-auto" />
                <h4 className="font-bold text-sm text-slate-900 m-0">
                  Submit {theme.name} Transaction ID
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTrxModal(false)}
                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              আপনার {theme.bnName} সেন্ড মানি কনফার্মেশন এসএমএস থেকে <strong>TrxID</strong> টি নিচে লিখুন:
            </p>

            <form onSubmit={handleManualTrxSubmit} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                value={manualTrxId}
                onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                placeholder="e.g. DD08PXL5K8"
                className="w-full h-10 rounded-md border border-slate-300 bg-slate-50 px-3.5 font-mono text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />

              <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                <span>Amount: ৳{totalBdt}</span>
                <span>Inv: {orderId}</span>
              </div>

              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-md text-xs font-semibold ${
                    modalFeedback.type === 'ok'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {modalFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingTrx}
                style={{ backgroundColor: theme.brandBg }}
                className="w-full h-10 rounded-md text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95 border-0 disabled:opacity-50"
              >
                {submittingTrx ? (
                  <Loader2 className="h-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{submittingTrx ? 'Verifying...' : 'Confirm & Verify'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
