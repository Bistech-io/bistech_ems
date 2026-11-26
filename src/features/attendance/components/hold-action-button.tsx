'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, Loader2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HoldActionButtonProps {
  variant: 'check-in' | 'check-out';
  label: string;
  loadingLabel: string;
  durationMs?: number;
  disabled?: boolean;
  isLoading?: boolean;
  onComplete: () => void;
}

export function HoldActionButton({
  variant,
  label,
  loadingLabel,
  durationMs = 2500,
  disabled = false,
  isLoading = false,
  onComplete,
}: HoldActionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [showEarlyHint, setShowEarlyHint] = useState(false);
  const [boxSize, setBoxSize] = useState({ width: 212, height: 52 });

  const isDisabled = disabled || isLoading;

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBoxSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [label, loadingLabel, isLoading]);

  const stopHolding = useCallback((showHintIfIncomplete: boolean) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const wasHoldingIncomplete =
      startTimeRef.current !== null && !completedRef.current;

    startTimeRef.current = null;
    setIsHolding(false);
    setProgress(0);

    if (showHintIfIncomplete && wasHoldingIncomplete) {
      setShowEarlyHint(true);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => {
        setShowEarlyHint(false);
      }, 2200);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const startHolding = useCallback(() => {
    if (isDisabled || startTimeRef.current !== null) return;

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    setShowEarlyHint(false);

    completedRef.current = false;
    startTimeRef.current = performance.now();
    setIsHolding(true);
    setProgress(0);

    const tick = (now: number) => {
      if (startTimeRef.current === null) return;
      const elapsed = now - startTimeRef.current;
      const nextProgress = Math.min(1, Math.max(0, elapsed / durationMs));
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        completedRef.current = true;
        startTimeRef.current = null;
        rafRef.current = null;
        setIsHolding(false);
        setProgress(1);
        onComplete();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs, isDisabled, onComplete]);

  // Reset visual ring once loading finishes
  useEffect(() => {
    if (!isLoading && !isHolding && progress > 0) {
      const resetTimer = setTimeout(() => setProgress(0), 180);
      return () => clearTimeout(resetTimer);
    }
    return undefined;
  }, [isLoading, isHolding, progress]);

  const remainingSeconds = Math.max(
    0,
    ((1 - progress) * durationMs) / 1000,
  ).toFixed(1);

  const isCheckOut = variant === 'check-out';
  const ringPadding = 5;
  const svgW = boxSize.width + ringPadding * 2;
  const svgH = boxSize.height + ringPadding * 2;
  const strokeColor = isCheckOut ? '#F59E0B' : '#4CAF7D';
  const trackColor = isCheckOut
    ? 'rgba(245, 158, 11, 0.24)'
    : 'rgba(76, 175, 125, 0.24)';

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="relative inline-flex items-center justify-center p-[5px]">
        {/* Perimeter Progress Bar wrapping around the button */}
        <svg
          aria-hidden="true"
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          {/* Subtle outer track visible while holding */}
          <rect
            x="2"
            y="2"
            width={Math.max(0, svgW - 4)}
            height={Math.max(0, svgH - 4)}
            rx="19"
            ry="19"
            fill="none"
            stroke={trackColor}
            strokeWidth="3"
            style={{
              opacity: isHolding || isLoading ? 1 : 0.45,
              transition: 'opacity 180ms ease',
            }}
          />
          {/* Animated progress stroke tracing around the button over 2.5s */}
          <rect
            x="2"
            y="2"
            width={Math.max(0, svgW - 4)}
            height={Math.max(0, svgH - 4)}
            rx="19"
            ry="19"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - progress * 100}
            style={{
              filter: isHolding
                ? `drop-shadow(0 0 6px ${isCheckOut ? 'rgba(245,158,11,0.65)' : 'rgba(76,175,125,0.65)'})`
                : 'none',
            }}
          />
        </svg>

        <button
          ref={buttonRef}
          type="button"
          disabled={isDisabled}
          aria-label={`${label} (hold for ${(durationMs / 1000).toFixed(1)} seconds)`}
          aria-busy={isLoading}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            startHolding();
          }}
          onPointerUp={() => stopHolding(true)}
          onPointerLeave={() => stopHolding(false)}
          onPointerCancel={() => stopHolding(false)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              startHolding();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              stopHolding(true);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'relative inline-flex h-12 min-w-[205px] select-none touch-none items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 text-sm font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60',
            isHolding && 'scale-[0.985]',
            isCheckOut
              ? 'border border-[#F59E0B]/55 bg-[#D97706] text-[#FAF7F0] shadow-[0_8px_24px_-6px_rgba(217,119,6,0.45)] hover:bg-[#B45309]'
              : 'bg-[#2E8B57] text-[#F0F5F2] shadow-[0_8px_24px_-6px_rgba(46,139,87,0.55)] hover:bg-[#349960]',
          )}
        >
          {/* Subtle inner fill sweep reinforcing the perimeter progress bar */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: isCheckOut
                ? 'rgba(255, 255, 255, 0.16)'
                : 'rgba(255, 255, 255, 0.14)',
            }}
          />

          <span className="relative z-10 inline-flex items-center gap-2.5">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingLabel}</span>
              </>
            ) : isHolding ? (
              <>
                {isCheckOut ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                <span className="tabular-nums">
                  Hold… {remainingSeconds}s
                </span>
              </>
            ) : (
              <>
                {isCheckOut ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                <span>{label}</span>
              </>
            )}
          </span>
        </button>
      </div>

      <span
        role="status"
        aria-live="polite"
        className={cn(
          'pr-1 text-[11px] font-medium transition-colors duration-150',
          showEarlyHint
            ? 'text-[#F59E0B]'
            : isHolding
              ? isCheckOut
                ? 'text-[#F59E0B]'
                : 'text-[#4CAF7D]'
              : 'text-[#6E8078]',
        )}
      >
        {showEarlyHint
          ? `Keep holding for ${(durationMs / 1000).toFixed(1)}s to confirm`
          : isHolding
            ? 'Keep holding until the border completes…'
            : `Press & hold ${(durationMs / 1000).toFixed(1)}s`}
      </span>
    </div>
  );
}
