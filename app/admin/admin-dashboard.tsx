"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminData {
  metrics: {
    requests: number;
    refusals: number;
    escalationRate: number;
    averageLatencyMs: number;
  };
  requests: Array<{
    requestId: string;
    redactedInput: string;
    retrievedChunkIds: string[];
    toolCalls: string[];
    approvals: string[];
    model: string;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    refused: boolean;
    escalationOffered: boolean;
    createdAt: string;
  }>;
}

export function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData>();
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin/data", { cache: "no-store" });
    if (response.status === 401) {
      router.refresh();
      return;
    }
    const payload = await response.json() as AdminData | { error: string };
    if (!response.ok || !("metrics" in payload)) {
      throw new Error("error" in payload ? payload.error : "Admin data could not be loaded.");
    }
    setData(payload);
  }, [router]);

  useEffect(() => {
    loadData().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Admin data could not be loaded.");
    });
  }, [loadData]);

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">AUDIT & MONITORING</p>
          <h1>Admin dashboard</h1>
        </div>
        <button className="secondary-button" type="button" onClick={logout}>Sign out</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p>Loading audit data…</p>}
      {data && (
        <>
          <div className="metrics">
            <Metric label="Requests" value={data.metrics.requests} />
            <Metric label="Refusals" value={data.metrics.refusals} />
            <Metric label="Escalation rate" value={`${(data.metrics.escalationRate * 100).toFixed(1)}%`} />
            <Metric label="Average latency" value={`${data.metrics.averageLatencyMs} ms`} />
          </div>
          <div className="audit-heading">
            <h2>Recent requests</h2>
            <a className="export-link" href="/api/admin/export">Export CSV</a>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Redacted input</th>
                  <th>Sources</th>
                  <th>Tools</th>
                  <th>Model</th>
                  <th>Latency</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((row) => (
                  <tr key={row.requestId}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{row.redactedInput}</td>
                    <td>{row.retrievedChunkIds.join(", ") || "—"}</td>
                    <td>{row.toolCalls.join(", ") || "—"}</td>
                    <td>{row.model}</td>
                    <td>{row.latencyMs} ms</td>
                    <td>{row.escalationOffered ? "Escalation offered" : row.refused ? "Refused" : "Answered"}</td>
                  </tr>
                ))}
                {data.requests.length === 0 && (
                  <tr><td colSpan={7}>No requests have been recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="notice">Showing the latest 50 requests. Inputs are stored after PII redaction.</p>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
