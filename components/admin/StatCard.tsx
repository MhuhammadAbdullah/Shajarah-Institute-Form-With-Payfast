import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
  format?: "number" | "currency";
}

export function StatCard({ label, value, icon: Icon, accent, format = "number" }: StatCardProps) {
  const displayValue =
    format === "currency"
      ? new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value)
      : value.toLocaleString();

  return (
    <Card className="flex flex-col gap-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-5 w-5" />
        <span className="sr-only">{label} icon</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{displayValue}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}
