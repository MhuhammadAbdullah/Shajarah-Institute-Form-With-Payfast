"use client";

import { motion } from "motion/react";

export function SuccessCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 print:hidden"
    >
      <svg className="h-7 w-7 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </motion.div>
  );
}
