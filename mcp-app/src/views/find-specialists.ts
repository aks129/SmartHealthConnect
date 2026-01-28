import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const searchBtn = document.getElementById("search-btn")!;
const specialtyInput = document.getElementById("specialty-input")! as HTMLInputElement;
const stateInput = document.getElementById("state-input")! as HTMLInputElement;
const cityInput = document.getElementById("city-input")! as HTMLInputElement;

const app = new App({ name: "Find Specialists", version: "1.0.0" });

interface Provider {
  npi?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  credential?: string;
  specialty?: string;
  taxonomy_description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
}

interface SearchResult {
  providers?: Provider[];
  results?: Provider[];
  specialty?: string;
  location?: { state?: string; city?: string };
  result_count?: number;
}

function renderProviders(data: SearchResult) {
  const providers = data.providers || data.results || [];
  const count = data.result_count || providers.length;

  contentEl.innerHTML = `
    <div class="count-banner">Found ${count} specialist${count !== 1 ? "s" : ""}${data.specialty ? ` in ${data.specialty}` : ""}${data.location?.state ? ` (${data.location.city ? data.location.city + ", " : ""}${data.location.state})` : ""}</div>
    ${providers.map((p) => {
      const name = p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown Provider";
      const specialty = p.specialty || p.taxonomy_description || "";
      const addr = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");
      return `
        <div class="provider-card">
          <div class="provider-name">${name}${p.credential ? `, ${p.credential}` : ""}</div>
          ${specialty ? `<div class="provider-specialty">${specialty}</div>` : ""}
          <div class="provider-details">
            ${addr ? `<span>&#x1F4CD; ${addr}</span>` : ""}
            ${p.phone ? `<span>&#x1F4DE; ${p.phone}</span>` : ""}
          </div>
          ${p.npi ? `<div class="npi-tag">NPI: ${p.npi}</div>` : ""}
        </div>`;
    }).join("")}
    ${providers.length === 0 ? '<div class="loading">No providers found. Try different search criteria.</div>' : ""}`;
}

app.ontoolresult = (result) => {
  try {
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderProviders(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
};

async function search() {
  const specialty = specialtyInput.value.trim();
  if (!specialty) return;
  const args: Record<string, string> = { specialty };
  const state = stateInput.value.trim().toUpperCase();
  const city = cityInput.value.trim();
  if (state) args.state = state;
  if (city) args.city = city;

  contentEl.innerHTML = `<div class="loading">Searching for ${specialty} specialists...</div>`;
  try {
    const result = await app.callServerTool({ name: "find_specialists", arguments: args });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderProviders(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
}

searchBtn.addEventListener("click", search);
[specialtyInput, stateInput, cityInput].forEach((el) => {
  el.addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });
});

app.connect();
