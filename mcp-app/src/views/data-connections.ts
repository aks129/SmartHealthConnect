import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const refreshBtn = document.getElementById("refresh-btn")!;

const app = new App({ name: "Data Connections", version: "1.0.0" });

interface Connection {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  type: "oauth" | "session";
}

interface AuditEntry {
  id: number;
  toolName: string;
  action: string;
  outcome: string;
  redactionApplied: boolean;
  phiAccessed: boolean;
  detail?: string;
  timestamp: string;
}

interface ConnectionsData {
  connections: Connection[];
  auditLog: {
    entries: AuditEntry[];
    count: number;
  };
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderData(data: ConnectionsData) {
  const conns = data.connections || [];
  const entries = data.auditLog?.entries || [];

  contentEl.innerHTML = `
    <div class="section">
      <h2><span class="icon">&#x1F517;</span> Available Connections</h2>
      ${conns.map((c) => `
        <div class="connection-card">
          <div class="connection-info">
            <div class="connection-name">${c.name}</div>
            <div class="connection-desc">${c.description}</div>
            <div class="connection-type">${c.type === "oauth" ? "OAuth 2.0" : "Session-based"}</div>
          </div>
          <span class="badge ${c.configured ? "badge-configured" : "badge-unconfigured"}">
            ${c.configured ? "Configured" : "Not Configured"}
          </span>
        </div>
      `).join("")}
      ${conns.length === 0 ? '<div class="empty">No connections available</div>' : ""}
    </div>

    <div class="section">
      <h2><span class="icon">&#x1F4CB;</span> PHI Access Audit Log</h2>
      ${entries.length > 0 ? `
        <table class="audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tool</th>
              <th>Action</th>
              <th>Outcome</th>
              <th>PHI</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((e) => `
              <tr>
                <td>${formatTimestamp(e.timestamp)}</td>
                <td>${e.toolName}</td>
                <td>${e.action}</td>
                <td><span class="outcome-${e.outcome}">${e.outcome}</span></td>
                <td>${e.phiAccessed ? '<span class="phi-badge">PHI</span>' : "—"}${e.redactionApplied ? ' <span class="phi-badge">Redacted</span>' : ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : '<div class="empty">No audit log entries yet</div>'}
    </div>

    <div class="disclaimer">
      All health data access is logged. PHI is automatically redacted before reaching AI systems.
      This audit log tracks tool invocations, data access patterns, and redaction status.
    </div>
  `;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) {
      renderData(JSON.parse(text.text));
    }
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error loading data: ${e}</div>`;
  }
};

refreshBtn.addEventListener("click", async () => {
  contentEl.innerHTML = '<div class="loading">Refreshing...</div>';
  try {
    const result = await app.callServerTool({
      name: "data_connections",
      arguments: {},
    });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderData(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
});

app.connect();
