import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const searchBtn = document.getElementById("search-btn")!;
const drugInput = document.getElementById("drug-input")! as HTMLInputElement;

const app = new App({ name: "Drug Interactions", version: "1.0.0" });

interface DrugResult {
  drug_name?: string;
  brand_name?: string;
  generic_name?: string;
  interactions?: Array<{
    drug?: string;
    description?: string;
    severity?: string;
  }>;
  warnings?: string[];
  drug_interactions?: string[];
  results?: Array<{
    drug_interactions?: string[];
    warnings?: string[];
    openfda?: { brand_name?: string[]; generic_name?: string[] };
  }>;
}

function renderDrug(data: DrugResult) {
  const name = data.drug_name || data.brand_name || data.generic_name || drugInput.value;
  const result = data.results?.[0];
  const interactions = data.interactions || [];
  const warnings = data.warnings || result?.warnings || [];
  const drugInteractions = data.drug_interactions || result?.drug_interactions || [];
  const brandName = result?.openfda?.brand_name?.[0] || data.brand_name || "";
  const genericName = result?.openfda?.generic_name?.[0] || data.generic_name || "";

  contentEl.innerHTML = `
    <div class="drug-name">
      <h2>${name}</h2>
      ${brandName || genericName ? `<div class="meta">${[brandName, genericName].filter(Boolean).join(" &bull; ")}</div>` : ""}
    </div>
    ${interactions.length > 0 ? `
      <div class="section">
        <h3>Known Interactions (${interactions.length})</h3>
        ${interactions.map((i) => {
          const sevClass = i.severity === "high" ? "severity-high" : i.severity === "moderate" ? "severity-moderate" : "severity-low";
          return `<div class="interaction"><span class="${sevClass}">${i.severity || "unknown"}</span> &mdash; ${i.drug || ""}: ${i.description || ""}</div>`;
        }).join("")}
      </div>` : ""}
    ${drugInteractions.length > 0 ? `
      <div class="section">
        <h3>Drug Interactions (${drugInteractions.length})</h3>
        ${drugInteractions.slice(0, 10).map((d) => `<div class="interaction">${d}</div>`).join("")}
        ${drugInteractions.length > 10 ? `<div class="interaction" style="color:#94a3b8">...and ${drugInteractions.length - 10} more</div>` : ""}
      </div>` : ""}
    ${warnings.length > 0 ? `
      <div class="section">
        <h3>Warnings</h3>
        <ul class="warning-list">
          ${warnings.slice(0, 5).map((w) => `<li>${typeof w === "string" ? w.slice(0, 300) : w}${typeof w === "string" && w.length > 300 ? "..." : ""}</li>`).join("")}
        </ul>
      </div>` : ""}
    ${interactions.length === 0 && drugInteractions.length === 0 && warnings.length === 0 ?
      '<div class="section"><p style="color:#94a3b8;text-align:center">No interaction data found for this drug.</p></div>' : ""}`;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderDrug(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
};

async function searchDrug() {
  const drug = drugInput.value.trim();
  if (!drug) return;
  contentEl.innerHTML = `<div class="loading">Checking interactions for "${drug}"...</div>`;
  try {
    const result = await app.callServerTool({
      name: "drug_interactions",
      arguments: { drug_name: drug },
    });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderDrug(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
}

searchBtn.addEventListener("click", searchDrug);
drugInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchDrug();
});

app.connect();
