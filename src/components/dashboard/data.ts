import type { Connector, DashboardIncident, TeamMember } from "./types";

export const incidents: DashboardIncident[] = [
  {
    id: "#4821",
    title: "db-primary ECONNREFUSED cascade",
    severity: "critical",
    timeAgo: "10m ago",
    confidence: 94,
    service: "auth-service",
    status: "open",
    summary:
      "DB primary is refusing connections on port 5432. Retries are exhausted, the circuit breaker is open, and upstream writes are failing.",
    evidence: [
      "10:42:09 ERROR ECONNREFUSED connect to db-primary:5432",
      "10:42:10 ERROR Max retries exceeded, connection pool exhausted",
      "10:42:11 WARN Circuit breaker OPEN for db-primary"
    ],
    rootCauses: ["Primary database process or network route is unavailable, causing retry exhaustion and circuit breaker activation."],
    actions: [
      "Verify network route to db-primary:5432",
      "Check Postgres process health on the primary host",
      "Promote read replica if primary recovery exceeds the error budget"
    ]
  },
  {
    id: "#4820",
    title: "auth-service JWT validation failure",
    severity: "high",
    timeAgo: "1h ago",
    confidence: 87,
    service: "api-gateway",
    status: "investigating",
    summary: "JWT verification failures rose after key rotation. A stale JWKS cache is the most likely cause.",
    evidence: ["kid mismatch on gateway-2", "JWKS cache age 47m", "401 rate climbed to 18%"],
    rootCauses: ["Gateway instances are validating tokens against stale JWKS cache entries after key rotation."],
    actions: ["Invalidate gateway JWKS cache", "Confirm issuer rotation timestamp", "Replay failed auth samples"]
  },
  {
    id: "#4818",
    title: "Worker OOM on queue depth spike",
    severity: "medium",
    timeAgo: "3h ago",
    confidence: 79,
    service: "worker-pool",
    status: "mitigated",
    summary: "Queue depth exceeded worker memory limits after a delayed batch replay.",
    evidence: ["rss > 1.8GB", "queue depth 42k", "batch replay started 09:13"],
    rootCauses: ["Delayed batch replay pushed queue depth beyond worker memory headroom."],
    actions: ["Pause replay job", "Scale worker concurrency", "Add batch size guardrail"]
  },
  {
    id: "#4815",
    title: "CDN cache miss rate 94% on /assets",
    severity: "low",
    timeAgo: "6h ago",
    confidence: 91,
    service: "cdn-edge",
    status: "resolved",
    summary: "A deploy invalidated asset cache keys without warming critical bundles.",
    evidence: ["cache miss rate 94%", "asset key prefix changed", "origin latency p95 830ms"],
    rootCauses: ["Asset cache key changes invalidated edge entries before critical bundles were warmed."],
    actions: ["Warm critical assets", "Review cache key deployment diff", "Pin immutable asset prefixes"]
  },
  {
    id: "#4810",
    title: "Redis keyspace notification lag",
    severity: "medium",
    timeAgo: "12h ago",
    confidence: 82,
    service: "cache-layer",
    status: "resolved",
    summary: "Keyspace notifications lagged during a persistence snapshot.",
    evidence: ["notification lag 19s", "BGSAVE active", "eviction pressure normal"],
    rootCauses: ["Redis persistence snapshot competed with keyspace notification delivery."],
    actions: ["Shift snapshot window", "Add lag alert", "Separate notification workload"]
  }
];

export const kpis = [
  { label: "Active Incidents", value: "3", delta: "+2 today", tone: "red", sparkline: [4, 8, 6, 12, 9, 15, 11, 18, 14, 22, 16, 28, 20, 24] },
  { label: "Analyses Today", value: "24", delta: "40% vs yesterday", tone: "blue", sparkline: [4, 2, 6, 4, 10, 8, 16, 12, 20, 14, 8, 12, 6, 4] },
  { label: "Avg. Triage Time", value: "3.8s", delta: "0.4s faster this week", tone: "green", sparkline: [12, 8, 15, 10, 22, 18, 21, 15, 12, 9, 13, 17, 11, 6] },
  { label: "MTTR Today", value: "14m", delta: "6m below average", tone: "amber", sparkline: [6, 3, 9, 6, 15, 12, 24, 18, 30, 21, 12, 18, 9, 6] }
];

export const connectors: Connector[] = [
  { id: "github", name: "GitHub", category: "VCS", description: "Ingest commit hooks and CI run logs for deployment correlation.", connected: true },
  { id: "aws", name: "AWS CloudWatch", category: "Cloud", description: "Monitor log groups and open incidents on threshold breaches.", connected: true },
  { id: "gcp", name: "Google Cloud", category: "Cloud", description: "Stream Cloud Logging and Error Reporting into TracePilot.", connected: false },
  { id: "datadog", name: "Datadog", category: "Observability", description: "Correlate metrics, traces, and logs with incident timelines.", connected: true },
  { id: "pagerduty", name: "PagerDuty", category: "Alerting", description: "Escalate critical incidents to the active on-call policy.", connected: false },
  { id: "slack", name: "Slack", category: "Comms", description: "Post incident reports and severity alerts to Slack channels.", connected: true },
  { id: "jira", name: "Jira", category: "Ticketing", description: "Create and link tickets to incident reports automatically.", connected: false },
  { id: "elastic", name: "Elasticsearch", category: "Log Platform", description: "Connect Elastic indices for structured log ingestion at scale.", connected: false }
];

export const sampleLog = `2024-01-15T10:42:01.023Z INFO  auth-service started on port 8080
2024-01-15T10:42:03.441Z INFO  DB connection pool initialized pool=10
2024-01-15T10:42:07.882Z WARN  Response latency degraded p99=2840ms threshold=1000ms
2024-01-15T10:42:09.115Z ERROR ECONNREFUSED connect to db-primary:5432
2024-01-15T10:42:09.118Z ERROR ECONNREFUSED connect to db-primary:5432 retry=1/3
2024-01-15T10:42:09.991Z ERROR ECONNREFUSED connect to db-primary:5432 retry=2/3
2024-01-15T10:42:10.770Z ERROR Max retries exceeded connection pool exhausted
2024-01-15T10:42:10.775Z ERROR 503 Service Unavailable health checks failing
2024-01-15T10:42:11.002Z WARN  Circuit breaker OPEN for db-primary`;

export const pipelineStages = ["Intake", "Severity", "Root Cause", "Remediation", "Report"] as const;

export const teamMembers: TeamMember[] = [
  { name: "James Doe", email: "james@tracepilot.io", role: "Owner", initials: "JD", active: true },
  { name: "Amara Osei", email: "amara@tracepilot.io", role: "Admin", initials: "AO", active: true },
  { name: "Lena Fischer", email: "lena@tracepilot.io", role: "Member", initials: "LF", active: true },
  { name: "Ravi Kumar", email: "ravi@tracepilot.io", role: "Member", initials: "RK", active: false }
];
