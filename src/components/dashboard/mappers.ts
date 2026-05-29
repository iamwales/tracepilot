import type { IncidentRecord } from "@/features/incidents/types";
import type { DashboardIncident, DashboardIncidentStatus } from "./types";

export function mapIncidentRecord(record: IncidentRecord): DashboardIncident {
  return {
    id: `#${record.id.slice(0, 8)}`,
    recordId: record.id,
    title: record.title,
    severity: record.severity,
    timeAgo: formatTimeAgo(record.createdAt),
    confidence: Math.round(record.analysis.confidence * 100),
    service: record.source,
    status: mapStatus(record.status),
    summary: record.analysis.summary,
    evidence: record.analysis.evidence,
    rootCauses: record.analysis.rootCauses,
    actions: record.analysis.actions
  };
}

function mapStatus(status: IncidentRecord["status"]): DashboardIncidentStatus {
  if (status === "completed") return "resolved";
  if (status === "running") return "investigating";
  if (status === "failed") return "open";
  return "mitigated";
}

function formatTimeAgo(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
