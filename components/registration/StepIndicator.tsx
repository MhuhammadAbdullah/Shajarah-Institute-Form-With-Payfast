"use client";

import { motion } from "motion/react";
import type { PublicFormStep } from "@/lib/formEngine/types";
import { cn } from "@/utils/cn";

interface StepIndicatorProps {
  steps: PublicFormStep[];
  currentIndex: number;
  completedSteps: Set<number>;
  onJump: (index: number) => void;
}

export function StepIndicator({ steps, currentIndex, completedSteps, onJump }: StepIndicatorProps) {
  const progressPercent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="sticky top-0 z-10 -mx-6 mb-8 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          Step {currentIndex + 1} of {steps.length}
        </p>
        <p className="text-xs font-medium text-emerald-700">{steps[currentIndex]?.title}</p>
      </div>

      <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-emerald-600"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentIndex;
          const isReachable = isCompleted || isCurrent || index < currentIndex;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => isReachable && onJump(index)}
                disabled={!isReachable}
                className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    isCompleted && "bg-emerald-700 text-white",
                    isCurrent && !isCompleted && "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-600",
                    !isCompleted && !isCurrent && "bg-slate-100 text-slate-400",
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    isCurrent ? "text-emerald-800" : isCompleted ? "text-slate-700" : "text-slate-400",
                  )}
                >
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1 rounded transition-colors", isCompleted ? "bg-emerald-600" : "bg-slate-200")} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
