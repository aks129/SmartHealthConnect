import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const searchBtn = document.getElementById("search-btn")!;
const conditionInput = document.getElementById("condition-input")! as HTMLInputElement;

const app = new App({ name: "Clinical Trials", version: "1.0.0" });

interface Trial {
  nctId?: string;
  nct_id?: string;
  title?: string;
  briefTitle?: string;
  brief_title?: string;
  status?: string;
  overallStatus?: string;
  overall_status?: string;
  phase?: string;
  studyType?: string;
  study_type?: string;
  description?: string;
  briefSummary?: string;
  brief_summary?: string;
  conditions?: string[];
  interventions?: string[];
  sponsor?: string;
  leadSponsor?: string;
  lead_sponsor?: string;
}

interface TrialResult {
  trials?: Trial[];
  studies?: Trial[];
  results?: Trial[];
  totalCount?: number;
  total_count?: number;
}

function renderTrials(data: TrialResult) {
  const trials = data.trials || data.studies || data.results || [];
  const total = data.totalCount || data.total_count || trials.length;

  contentEl.innerHTML = `
    <div class="count-banner">Found ${total} clinical trial${total !== 1 ? "s" : ""}</div>
    ${trials.map((t) => {
      const title = t.title || t.briefTitle || t.brief_title || "Untitled Study";
      const status = t.status || t.overallStatus || t.overall_status || "";
      const statusLower = status.toLowerCase();
      const badgeClass = statusLower.includes("recruit") ? "badge-recruiting" : statusLower.includes("complet") ? "badge-completed" : "badge-active";
      const phase = t.phase || "";
      const desc = t.description || t.briefSummary || t.brief_summary || "";
      const id = t.nctId || t.nct_id || "";
      return `
        <div class="trial-card">
          <div class="trial-title">${title}</div>
          <div class="trial-meta">
            ${status ? `<span class="badge ${badgeClass}">${status}</span>` : ""}
            ${phase ? `<span class="badge badge-phase">${phase}</span>` : ""}
          </div>
          ${desc ? `<div class="trial-desc">${desc.slice(0, 250)}${desc.length > 250 ? "..." : ""}</div>` : ""}
          ${id ? `<div class="trial-id">${id}</div>` : ""}
        </div>`;
    }).join("")}
    ${trials.length === 0 ? '<div class="loading">No trials found. Try a different condition.</div>' : ""}`;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderTrials(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
};

async function search() {
  const condition = conditionInput.value.trim();
  if (!condition) return;
  contentEl.innerHTML = `<div class="loading">Searching trials for "${condition}"...</div>`;
  try {
    const result = await app.callServerTool({
      name: "clinical_trials",
      arguments: { condition },
    });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderTrials(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
}

searchBtn.addEventListener("click", search);
conditionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

app.connect();
