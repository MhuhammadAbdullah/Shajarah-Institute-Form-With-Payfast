"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailySeriesPoint } from "@/services/dashboard.service";

function formatDayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(isoDate));
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const registrations = payload.find((p) => p.dataKey === "registrations")?.value ?? 0;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{label ? formatDayLabel(label) : ""}</p>
      <p className="mt-1 text-slate-600">Registrations: {registrations}</p>
      <p className="text-slate-600">Revenue: PKR {revenue.toLocaleString()}</p>
    </div>
  );
}

export function DashboardChart({ data }: { data: DailySeriesPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="registrations" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
          <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="registrations" dataKey="registrations" fill="#d1fae5" radius={[4, 4, 0, 0]} barSize={12} />
          <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#047857" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
