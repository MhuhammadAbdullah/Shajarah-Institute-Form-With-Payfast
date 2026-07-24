"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PublicPromotion } from "@/types/promotion";

// Fixed, statically-analyzable class sets so Tailwind's JIT can see every
// literal class string - a free-text admin `bannerColor` field can't safely
// drive dynamic `bg-${color}-50` class construction.
const COLOR_THEMES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-600 text-white" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-600 text-white" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", badge: "bg-rose-600 text-white" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", badge: "bg-blue-600 text-white" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", badge: "bg-purple-600 text-white" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", badge: "bg-slate-600 text-white" },
};

function themeFor(color: string | null): (typeof COLOR_THEMES)[string] {
  return COLOR_THEMES[(color ?? "").toLowerCase()] ?? COLOR_THEMES.emerald;
}

function discountLine(promo: PublicPromotion): string {
  if (promo.discountType === "BOGO") return `Buy ${promo.buyQuantity} Get ${promo.freeQuantity} Free`;
  if (promo.discountType === "PERCENT") return `${promo.value ?? 0}% OFF`;
  return `${(promo.value ?? 0).toLocaleString()} OFF`;
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const AUTO_ADVANCE_MS = 6000;

export function PromotionBanner() {
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/registration/promotions", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPromotions(data.promotions);
      })
      .catch(() => {
        // A failed banner fetch should never block the registration form itself.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (promotions.length <= 1 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % promotions.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [promotions.length, paused]);

  const current = useMemo(() => promotions[index] ?? null, [promotions, index]);

  if (!current) return null;

  const theme = themeFor(current.bannerColor);
  const expiry = formatExpiry(current.endDate);
  const title = current.bannerText || current.publicTitle || discountLine(current);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} px-5 py-4`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            {current.bannerIcon && <span className="text-2xl leading-none">{current.bannerIcon}</span>}
            <div>
              <p className={`text-sm font-semibold ${theme.text}`}>{title}</p>
              {current.subtitle && current.bannerText && <p className={`text-xs ${theme.text} opacity-80`}>{current.subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {current.requiresCode ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>Use Code: {current.code}</span>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>Applied Automatically</span>
            )}
            {expiry && <span className={`text-xs ${theme.text} opacity-70`}>Ends {expiry}</span>}
          </div>
        </motion.div>
      </AnimatePresence>

      {promotions.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {promotions.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show promotion ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-current" : "w-1.5 bg-current opacity-30"} ${theme.text}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
