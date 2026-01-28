import { App } from "@modelcontextprotocol/ext-apps";

const contentEl = document.getElementById("content")!;
const refreshBtn = document.getElementById("refresh-btn")!;

const app = new App({ name: "Health Summary", version: "1.0.0" });

interface FhirPatient {
  name?: Array<{ given?: string[]; family?: string }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system?: string; value?: string }>;
  address?: Array<{ city?: string; state?: string }>;
}

interface FhirCondition {
  code?: { text?: string; coding?: Array<{ display?: string }> };
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  onsetDateTime?: string;
}

interface FhirObservation {
  code?: { text?: string; coding?: Array<{ display?: string }> };
  valueQuantity?: { value?: number; unit?: string };
  component?: Array<{
    code?: { text?: string; coding?: Array<{ display?: string }> };
    valueQuantity?: { value?: number; unit?: string };
  }>;
  effectiveDateTime?: string;
}

interface FhirMedication {
  medicationCodeableConcept?: { text?: string; coding?: Array<{ display?: string }> };
  status?: string;
  dosageInstruction?: Array<{ text?: string }>;
}

interface FhirAllergy {
  code?: { text?: string; coding?: Array<{ display?: string }> };
  type?: string;
  criticality?: string;
  reaction?: Array<{ manifestation?: Array<{ text?: string }> }>;
}

interface HealthData {
  patient: FhirPatient;
  conditions: FhirCondition[];
  observations: FhirObservation[];
  medications: FhirMedication[];
  allergies: FhirAllergy[];
}

function renderData(data: HealthData) {
  const p = data.patient;
  const name = p.name?.[0]
    ? `${p.name[0].given?.join(" ") ?? ""} ${p.name[0].family ?? ""}`.trim()
    : "Unknown";
  const age = p.birthDate
    ? `${Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31557600000)} years`
    : "";
  const location = p.address?.[0]
    ? `${p.address[0].city ?? ""}, ${p.address[0].state ?? ""}`
    : "";

  contentEl.innerHTML = `
    <div class="patient-banner">
      <h2>${name}</h2>
      <div class="meta">${[p.gender, age, location].filter(Boolean).join(" &bull; ")}</div>
    </div>
    <div class="grid">
      <div class="card">
        <h3><span class="icon">&#x1F3E5;</span> Conditions</h3>
        ${(data.conditions || []).map((c) => {
          const name = c.code?.text || c.code?.coding?.[0]?.display || "Unknown";
          const status = c.clinicalStatus?.coding?.[0]?.code || "active";
          return `<div class="item"><span class="label">${name}</span> <span class="badge badge-active">${status}</span></div>`;
        }).join("") || '<div class="item value">No conditions on record</div>'}
      </div>
      <div class="card">
        <h3><span class="icon">&#x1F48A;</span> Medications</h3>
        ${(data.medications || []).map((m) => {
          const name = m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || "Unknown";
          const dosage = m.dosageInstruction?.[0]?.text || "";
          return `<div class="item"><span class="label">${name}</span><br><span class="value">${dosage}</span></div>`;
        }).join("") || '<div class="item value">No medications</div>'}
      </div>
      <div class="card">
        <h3><span class="icon">&#x1F4CA;</span> Vitals</h3>
        ${(data.observations || []).map((o) => {
          const name = o.code?.text || o.code?.coding?.[0]?.display || "Observation";
          if (o.component && o.component.length > 0) {
            return o.component.map((c) => {
              const cName = c.code?.text || c.code?.coding?.[0]?.display || "";
              const val = c.valueQuantity ? `${c.valueQuantity.value} ${c.valueQuantity.unit || ""}` : "N/A";
              return `<div class="vital-row"><span class="vital-label">${cName}</span><span class="vital-value">${val}</span></div>`;
            }).join("");
          }
          const val = o.valueQuantity ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ""}` : "N/A";
          return `<div class="vital-row"><span class="vital-label">${name}</span><span class="vital-value">${val}</span></div>`;
        }).join("") || '<div class="item value">No vitals recorded</div>'}
      </div>
      <div class="card">
        <h3><span class="icon">&#x26A0;</span> Allergies</h3>
        ${(data.allergies || []).map((a) => {
          const name = a.code?.text || a.code?.coding?.[0]?.display || "Unknown";
          const severity = a.criticality || "unknown";
          const badgeClass = severity === "high" ? "badge-high" : "badge-active";
          const reactions = a.reaction?.map((r) => r.manifestation?.map((m) => m.text).join(", ")).join("; ") || "";
          return `<div class="item"><span class="label">${name}</span> <span class="badge ${badgeClass}">${severity}</span>${reactions ? `<br><span class="value">${reactions}</span>` : ""}</div>`;
        }).join("") || '<div class="item value">No known allergies</div>'}
      </div>
    </div>`;
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
      name: "health_summary",
      arguments: {},
    });
    const text = result.content?.find((c: { type: string }) => c.type === "text") as { text?: string } | undefined;
    if (text?.text) renderData(JSON.parse(text.text));
  } catch (e) {
    contentEl.innerHTML = `<div class="loading">Error: ${e}</div>`;
  }
});

app.connect();
