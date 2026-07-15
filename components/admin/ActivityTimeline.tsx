import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/utils/format-date";
import { cn } from "@/utils/cn";

export type ActivityTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  tone: ActivityTone;
  href: string;
}

const TONE_STYLES: Record<ActivityTone, string> = {
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-600",
  neutral: "bg-slate-100 text-slate-600",
};

function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
      <circle cx="12" cy="12" r="12" />
    </svg>
  );
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No recent activity" description="New registrations and payments will show up here." />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", TONE_STYLES[event.tone])}>
            <DotIcon />
          </span>
          <div className="min-w-0 flex-1">
            <Link href={event.href} className="text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline">
              {event.title}
            </Link>
            <p className="truncate text-xs text-slate-500">{event.description}</p>
            <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(event.timestamp)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
