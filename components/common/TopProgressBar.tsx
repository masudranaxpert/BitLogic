'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TopProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Navigation completion: triggers on pathname or searchParams update
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(hideTimer);
  }, [pathname, searchParams]);

  // Click interceptor for instant feedback on internal route transitions
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        const isExternal = url.origin !== window.location.origin;
        const isHashOnly =
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          Boolean(url.hash);
        const isSamePage =
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          !url.hash;

        if (isExternal || isHashOnly || isSamePage) return;

        // Start progress bar immediately
        setVisible(true);
        setProgress(30);

        const step1 = setTimeout(() => {
          setProgress((prev) => (prev < 70 ? 70 : prev));
        }, 150);

        const step2 = setTimeout(() => {
          setProgress((prev) => (prev < 88 ? 88 : prev));
        }, 400);

        return () => {
          clearTimeout(step1);
          clearTimeout(step2);
        };
      } catch {
        // Ignore invalid URLs
      }
    };

    const handleCustomStart = () => {
      setVisible(true);
      setProgress(35);
      setTimeout(() => setProgress((p) => (p < 75 ? 75 : p)), 180);
    };

    const handleCustomDone = () => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    };

    window.addEventListener('click', handleAnchorClick, { capture: true });
    window.addEventListener('bl:nav-start', handleCustomStart);
    window.addEventListener('bl:nav-done', handleCustomDone);

    return () => {
      window.removeEventListener('click', handleAnchorClick, { capture: true });
      window.removeEventListener('bl:nav-start', handleCustomStart);
      window.removeEventListener('bl:nav-done', handleCustomDone);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-99999 h-[2.5px] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarInner />
    </Suspense>
  );
}
