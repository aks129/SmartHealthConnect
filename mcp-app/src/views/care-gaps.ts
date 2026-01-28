import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const refreshBtn = document.getElementById("refresh-btn")!;

const app = new App({ name: "Care Gaps", version: "1.0.0" });

interface CareGap {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  measure?: string;
  category?: string;
  lastPerformed?: string;
  nextDue?: string;
  recommendation?: string;
}

function renderGaps(gaps: CareGap[]) {
  const overdue = gaps.filter((g) => g.status === "overdue").length;
  const due = gaps.filter((g) => g.status === "due").length;
  const completed = gaps.filter((g) => g.status === "completed" || g.status === "met").length;

  contentEl.innerHTML = `
    <div class="summary">
      <div class="stat overdue"><div class="num">${overdue}</div><div class="label">Overdue</div></div>
      <div class="stat due"><div class="num">${due}</div><div class="label">Due Soon</div></div>
      <div class="stat ok"><div class="num">${completed}</div><div class="label">Up to Date</div></div>
    </div>
    ${gaps.map((g) => {
      const status = g.status || "due";
      const badgeClass = status === "overdue" ? "badge-overdue" : status === "completed" || status === "met" ? "badge-completed" : "badge-due";
      return `
        <div class="gap-card ${status}">
          <div class="gap-title">${g.title || "Care Gap"}</div>
          <div class="gap-desc">${g.description || g.recommendation || ""}</div>
          <div class="gap-meta">
            <span class="badge ${badgeClass}">${status.toUpperCase()}</span>
            ${g.measure ? `<span class="badge badge-measure">${g.measure}</span>` : ""}
            ${g.nextDue ? `<span class="badge badge-due">Due: ${g.nextDue}</span>` : ""}
          </div>
        </div>`;
    }).join("")}`;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) {
      const data = JSON.parse(text.text);
      renderGaps(Array.isArray(data) ? data : data.gaps || data.careGaps || [data]);
    }
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
};

refreshBtn.addEventListener("click", async () => {
  contentEl.innerHTML = '<div class="loading">Refreshing...</div>';
  try {
    const result = await app.callServerTool({ name: "care_gaps", arguments: {} });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) {
      const data = JSON.parse(text.text);
      renderGaps(Array.isArray(data) ? data : data.gaps || data.careGaps || [data]);
    }
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
});

app.connect();
