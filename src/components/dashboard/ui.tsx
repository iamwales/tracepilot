import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import type { Severity } from "@/features/incidents/types";
import { severityStyles } from "./theme";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  glow?: boolean;
};

export function Card({ className, glow = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/70",
        glow && "border-red-400/40 shadow-[0_0_34px_rgba(239,68,68,0.16)]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
  tone = "red"
}: {
  children: ReactNode;
  className?: string;
  tone?: "red" | "green" | "blue" | "amber" | "slate";
}) {
  const tones = {
    red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    slate: "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em]",
        severityStyles[severity]
      )}
    >
      {severity}
    </span>
  );
}

export function MiniLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500", className)}>
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Sparkline({
  data,
  color = "#ef4444",
  height = 36
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const width = 120;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const id = `spark-${color.replace("#", "")}-${data.length}`;

  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${points} ${width},${height}`} fill={`url(#${id})`} stroke="none" opacity="0.16" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Donut({
  segments,
  size = 96
}: {
  segments: Array<{ pct: number; color: string; opacity?: number }>;
  size?: number;
}) {
  const radius = size * 0.38;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {segments.map((segment, index) => {
        const dash = (segment.pct / 100) * circumference;
        const circle = (
          <circle
            key={`${segment.color}-${index}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={size * 0.09}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            opacity={segment.opacity ?? 1}
          />
        );
        offset += dash;
        return circle;
      })}
    </svg>
  );
}
