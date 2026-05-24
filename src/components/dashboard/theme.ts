export const severityStyles = {
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
} as const;

export const statusStyles = {
  open: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]",
  investigating: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]",
  mitigated: "bg-sky-400",
  resolved: "bg-emerald-400"
} as const;

export const toneColors = {
  red: "#ef4444",
  blue: "#38bdf8",
  green: "#34d399",
  amber: "#f59e0b"
} as const;
