import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const searchBtn = document.getElementById("search-btn")!;
const conditionInput = document.getElementById("condition-input")! as HTMLInputElement;

const app = new App({ name: "Research Insights", version: "1.0.0" });

interface Paper {
  title?: string;
  authors?: string | string[];
  date?: string;
  published?: string;
  source?: string;
  server?: string;
  abstract?: string;
  doi?: string;
  url?: string;
  category?: string;
}

interface ResearchResult {
  papers?: Paper[];
  preprints?: Paper[];
  results?: Paper[];
  condition?: string;
  total?: number;
}

function renderPapers(data: ResearchResult) {
  const papers = data.papers || data.preprints || data.results || [];
  const total = data.total || papers.length;
  const condition = data.condition || conditionInput.value;

  contentEl.innerHTML = `
    <div class="count-banner">Found ${total} preprint${total !== 1 ? "s" : ""} for "${condition}"</div>
    ${papers.map((p) => {
      const title = p.title || "Untitled";
      const authors = Array.isArray(p.authors) ? p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : "") : (p.authors || "");
      const source = p.source || p.server || "";
      const sourceLower = source.toLowerCase();
      const badgeClass = sourceLower.includes("med") ? "badge-medrxiv" : "badge-biorxiv";
      const date = p.date || p.published || "";
      const abstract = p.abstract || "";
      return `
        <div class="paper-card">
          <div class="paper-title">${title}</div>
          ${authors ? `<div class="paper-authors">${authors}</div>` : ""}
          <div class="paper-meta">
            ${source ? `<span class="badge ${badgeClass}">${source}</span>` : ""}
            ${date ? `<span class="badge badge-date">${date}</span>` : ""}
            ${p.category ? `<span class="badge badge-date">${p.category}</span>` : ""}
          </div>
          ${abstract ? `<div class="paper-abstract">${abstract.slice(0, 300)}${abstract.length > 300 ? "..." : ""}</div>` : ""}
          ${p.doi ? `<div class="paper-doi">DOI: ${p.doi}</div>` : ""}
        </div>`;
    }).join("")}
    ${papers.length === 0 ? '<div class="loading">No preprints found. Try a different condition.</div>' : ""}`;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderPapers(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
};

async function search() {
  const condition = conditionInput.value.trim();
  if (!condition) return;
  contentEl.innerHTML = `<div class="loading">Searching preprints for "${condition}"...</div>`;
  try {
    const result = await app.callServerTool({
      name: "research_insights",
      arguments: { condition },
    });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderPapers(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
}

searchBtn.addEventListener("click", search);
conditionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

app.connect();
