"use client";

import { useMemo, useState } from "react";

type AnyDefect = any;
type Scheme = any;

const statuses = [
  "REPORTED",
  "UNDER_REVIEW",
  "INSPECTION_REQUIRED",
  "QUOTE_REQUIRED",
  "AWAITING_APPROVAL",
  "APPROVED_FOR_REPAIR",
  "REPAIR_SCHEDULED",
  "REPAIR_COMPLETED",
  "VERIFICATION_REQUIRED",
  "MONITORING",
  "CLOSED",
  "REJECTED"
];

const riskRatings = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const urgencies = ["NORMAL", "URGENT", "EMERGENCY"];
const purposes = ["INSPECTION", "QUOTE", "APPROVAL", "REPAIR", "FOLLOW_UP", "MONITORING", "OTHER"];

function label(value: string) {
  return String(value || "").replaceAll("_", " ");
}

function isoDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function riskClass(value: string) {
  if (value === "CRITICAL") return "danger";
  if (value === "HIGH") return "warning";
  return "";
}

export default function DefectWorkspace({
  initialDefects,
  schemes
}: {
  initialDefects: AnyDefect[];
  schemes: Scheme[];
}) {
  const [defects, setDefects] = useState<AnyDefect[]>(initialDefects || []);
  const [selectedId, setSelectedId] = useState<string | null>(initialDefects?.[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const selected = defects.find((defect) => defect.id === selectedId) ?? defects[0] ?? null;

  const metrics = useMemo(() => {
    return {
      total: defects.length,
      open: defects.filter((defect) => !["CLOSED", "REJECTED"].includes(defect.status)).length,
      critical: defects.filter((defect) => defect.riskRating === "CRITICAL").length,
      high: defects.filter((defect) => defect.riskRating === "HIGH").length,
      approval: defects.filter((defect) => defect.status === "AWAITING_APPROVAL" || defect.committeeApprovalRequired).length,
      insurance: defects.filter((defect) => defect.insuranceRelevant).length
    };
  }, [defects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return defects.filter((defect) => {
      const blob = [
        defect.defectCode,
        defect.title,
        defect.description,
        defect.location,
        defect.lotReference,
        defect.assetCategory,
        defect.status,
        defect.riskRating,
        defect.responsibleParty,
        defect.reportedBy
      ].join(" ").toLowerCase();

      return (!q || blob.includes(q)) && (!statusFilter || defect.status === statusFilter);
    });
  }, [defects, query, statusFilter]);

  async function reloadDefects(status = "") {
    const res = await fetch(`/api/defects${status ? `?status=${status}` : ""}`);
    const data = await res.json();
    setDefects(data.defects || []);
  }

  async function createDefect() {
    const schemeId = schemes?.[0]?.id;

    if (!schemeId) {
      alert("Create or seed a scheme first.");
      return;
    }

    const res = await fetch("/api/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemeId, title: "New defect", description: "Describe the defect." })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to create defect.");
      return;
    }

    const data = await res.json();
    await reloadDefects(statusFilter);
    setSelectedId(data.defect.id);
  }

  async function saveDefect(formData: FormData) {
    if (!selected) return;

    const payload = Object.fromEntries(formData.entries());
    const res = await fetch(`/api/defects/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Save failed.");
      return;
    }

    await reloadDefects(statusFilter);
  }

  async function createLinkedTask(formData: FormData) {
    if (!selected) return;

    const payload = Object.fromEntries(formData.entries());
    const res = await fetch(`/api/defects/${selected.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to create linked task.");
      return;
    }

    await reloadDefects(statusFilter);
  }

  async function completeTask(taskId: string) {
    if (!window.confirm("Mark this linked task completed and update the defect status?")) return;

    const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to complete task.");
      return;
    }

    await reloadDefects(statusFilter);
  }

  async function closeDefect() {
    if (!selected) return;
    const notes = window.prompt("Closure notes required.");
    if (!notes) return;

    const res = await fetch(`/api/defects/${selected.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closureNotes: notes })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Defect cannot be closed yet.");
      return;
    }

    await reloadDefects(statusFilter);
  }

  async function reopenDefect() {
    if (!selected) return;
    const reason = window.prompt("Why is this defect being reopened?");
    if (!reason) return;

    const res = await fetch(`/api/defects/${selected.id}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to reopen defect.");
      return;
    }

    await reloadDefects(statusFilter);
  }

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Defect Register</h1>
          <p>Track reported defects, risk, evidence, committee approvals, linked tasks, and closure control.</p>
        </div>
        <div className="header-actions">
          <a className="button-link secondary-link" href="/">Maintenance Scheduler</a>
          <button className="secondary" onClick={() => reloadDefects(statusFilter)}>Refresh</button>
          <button onClick={createDefect}>New Defect</button>
        </div>
      </header>

      <section className="dashboard">
        <div className="metric"><span>Total Defects</span><strong>{metrics.total}</strong></div>
        <div className="metric warning"><span>Open</span><strong>{metrics.open}</strong></div>
        <div className="metric danger"><span>Critical</span><strong>{metrics.critical}</strong></div>
        <div className="metric warning"><span>High Risk</span><strong>{metrics.high}</strong></div>
        <div className="metric danger"><span>Committee Approval</span><strong>{metrics.approval}</strong></div>
        <div className="metric warning"><span>Insurance Relevant</span><strong>{metrics.insurance}</strong></div>
      </section>

      <main className="layout">
        <aside className="panel register-panel">
          <div className="panel-title">
            <h2>Register</h2>
            <span className="badge">{filtered.length}</span>
          </div>

          <label className="field">
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Defect, location, lot, asset, risk..." />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={async (event) => {
                setStatusFilter(event.target.value);
                await reloadDefects(event.target.value);
              }}
            >
              <option value="">All</option>
              {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          </label>

          <div className="task-list">
            {filtered.map((defect) => (
              <div
                key={defect.id}
                className={`task-card ${selected?.id === defect.id ? "active" : ""} ${riskClass(defect.riskRating)}`}
                onClick={() => setSelectedId(defect.id)}
              >
                <h4>{defect.defectCode} · {defect.title}</h4>
                <p>{defect.location || "No location"} · {defect.assetCategory || "No asset"}</p>
                <span className="pill">{label(defect.status)}</span>
                <span className={`pill ${riskClass(defect.riskRating)}`}>{defect.riskRating}</span>
                {defect.insuranceRelevant && <span className="pill warning">INSURANCE</span>}
                <p>{defect.description}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel">
          {!selected ? (
            <p>No defect selected.</p>
          ) : (
            <DefectDetail
              defect={selected}
              schemes={schemes}
              onSave={saveDefect}
              onCreateTask={createLinkedTask}
              onCompleteTask={completeTask}
              onClose={closeDefect}
              onReopen={reopenDefect}
            />
          )}
        </section>
      </main>
    </>
  );
}

function DefectDetail({
  defect,
  schemes,
  onSave,
  onCreateTask,
  onCompleteTask,
  onClose,
  onReopen
}: {
  defect: AnyDefect;
  schemes: Scheme[];
  onSave: (formData: FormData) => void;
  onCreateTask: (formData: FormData) => void;
  onCompleteTask: (taskId: string) => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  return (
    <>
      <div className="detail-head">
        <div>
          <h2>{defect.defectCode} · {defect.title}</h2>
          <p className="muted">Updated {new Date(defect.updatedAt).toLocaleString()}</p>
        </div>
        <div className="row-actions">
          {defect.status === "CLOSED" ? (
            <button className="secondary" onClick={onReopen}>Reopen Defect</button>
          ) : (
            <button className="danger" onClick={onClose}>Close Defect</button>
          )}
        </div>
      </div>

      <section className="record-banner">
        <div><span>Status</span><strong>{label(defect.status)}</strong></div>
        <div><span>Risk</span><strong>{defect.riskRating}</strong></div>
        <div><span>Urgency</span><strong>{defect.urgency}</strong></div>
        <div><span>Linked Tasks</span><strong>{defect.taskLinks?.length ?? 0}</strong></div>
      </section>

      <form action={onSave}>
        <div className="grid two">
          <label className="field">
            <span>Scheme</span>
            <select name="schemeId" defaultValue={defect.schemeId}>
              {schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
            </select>
          </label>

          <label className="field"><span>Title</span><input name="title" defaultValue={defect.title} /></label>
          <label className="field"><span>Location</span><input name="location" defaultValue={defect.location ?? ""} /></label>
          <label className="field"><span>Lot / Area Reference</span><input name="lotReference" defaultValue={defect.lotReference ?? ""} /></label>
          <label className="field"><span>Asset Category</span><input name="assetCategory" defaultValue={defect.assetCategory ?? ""} placeholder="Roof, drainage, gates, bins..." /></label>
          <label className="field"><span>Reported By</span><input name="reportedBy" defaultValue={defect.reportedBy ?? ""} /></label>
          <label className="field"><span>Reported Date</span><input type="date" name="reportedDate" defaultValue={isoDate(defect.reportedDate)} /></label>
          <label className="field"><span>Responsible Party</span><input name="responsibleParty" defaultValue={defect.responsibleParty ?? ""} /></label>

          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={defect.status}>
              {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Risk Rating</span>
            <select name="riskRating" defaultValue={defect.riskRating}>
              {riskRatings.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Urgency</span>
            <select name="urgency" defaultValue={defect.urgency}>
              {urgencies.map((urgency) => <option key={urgency} value={urgency}>{urgency}</option>)}
            </select>
          </label>

          <label className="field"><span>Estimated Cost</span><input type="number" step="0.01" name="estimatedCost" defaultValue={defect.estimatedCost ?? ""} /></label>
          <label className="field"><span>Actual Cost</span><input type="number" step="0.01" name="actualCost" defaultValue={defect.actualCost ?? ""} /></label>
          <label className="field"><span>Funding Source</span><input name="fundingSource" defaultValue={defect.fundingSource ?? ""} placeholder="Admin / Sinking / Insurance / Special Levy" /></label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea name="description" rows={4} defaultValue={defect.description} />
        </label>

        <section className="subsection">
          <h3>Governance / Risk Flags</h3>
          <div className="grid two">
            <label className="check-row"><input type="checkbox" name="commonPropertyImpact" defaultChecked={defect.commonPropertyImpact} /> Common property impact</label>
            <label className="check-row"><input type="checkbox" name="insuranceRelevant" defaultChecked={defect.insuranceRelevant} /> Insurance relevant</label>
            <label className="check-row"><input type="checkbox" name="legalSensitive" defaultChecked={defect.legalSensitive} /> Legal / sensitive matter</label>
            <label className="check-row"><input type="checkbox" name="committeeApprovalRequired" defaultChecked={defect.committeeApprovalRequired} /> Committee approval required</label>
            <label className="check-row"><input type="checkbox" name="ownerCommunicationRequired" defaultChecked={defect.ownerCommunicationRequired} /> Owner communication required</label>
            <label className="check-row"><input type="checkbox" name="closureEvidenceRequired" defaultChecked={defect.closureEvidenceRequired} /> Closure evidence required</label>
          </div>
        </section>

        <section className="subsection">
          <h3>Evidence Folders</h3>
          <div className="grid two">
            <label className="field"><span>Defect Evidence Folder URL</span><input name="evidenceFolderUrl" defaultValue={defect.evidenceFolderUrl ?? ""} /></label>
            <label className="field"><span>Photo Folder URL</span><input name="photoFolderUrl" defaultValue={defect.photoFolderUrl ?? ""} /></label>
            <label className="field"><span>Document Folder URL</span><input name="documentFolderUrl" defaultValue={defect.documentFolderUrl ?? ""} /></label>
          </div>
          <div className="row-actions">
            {defect.evidenceFolderUrl && <a className="button-link" href={defect.evidenceFolderUrl} target="_blank" rel="noreferrer">Open Evidence Folder</a>}
            {defect.photoFolderUrl && <a className="button-link" href={defect.photoFolderUrl} target="_blank" rel="noreferrer">Open Photos</a>}
            {defect.documentFolderUrl && <a className="button-link" href={defect.documentFolderUrl} target="_blank" rel="noreferrer">Open Documents</a>}
          </div>
        </section>

        <label className="field">
          <span>Closure Notes</span>
          <textarea name="closureNotes" rows={3} defaultValue={defect.closureNotes ?? ""} />
        </label>

        <button type="submit">Save Defect</button>
      </form>

      <section className="subsection">
        <h3>Create Linked Task</h3>
        <form action={onCreateTask}>
          <div className="grid three">
            <label className="field">
              <span>Purpose</span>
              <select name="purpose" defaultValue="INSPECTION">
                {purposes.map((purpose) => <option key={purpose} value={purpose}>{label(purpose)}</option>)}
              </select>
            </label>
            <label className="field"><span>Due Date</span><input type="date" name="dueDate" /></label>
            <label className="field"><span>Responsible Party</span><input name="responsibleParty" defaultValue={defect.responsibleParty ?? ""} /></label>
            <label className="field"><span>Contractor / Company</span><input name="contractorCompany" /></label>
            <label className="check-row"><input type="checkbox" name="isClosureTask" value="true" /> Closure task</label>
          </div>
          <label className="field">
            <span>Requirement</span>
            <textarea name="requirement" rows={3} placeholder="Leave blank to use default workflow wording." />
          </label>
          <button type="submit">Create Linked Task</button>
        </form>
      </section>

      <section className="subsection">
        <h3>Linked Tasks</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Evidence</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {defect.taskLinks?.map((link: any) => (
              <tr key={link.id}>
                <td>{link.task.taskCode}<br /><span className="muted">{link.task.areaAsset}</span></td>
                <td>{label(link.purpose)}{link.isClosureTask ? " / Closure" : ""}</td>
                <td>{label(link.task.status)}</td>
                <td>{link.task.financialControl?.paymentStatus ?? "PENDING"}</td>
                <td>{link.task.documents?.length ?? 0}</td>
                <td>
                  {link.task.status !== "COMPLETED" && (
                    <button className="secondary" onClick={() => onCompleteTask(link.task.id)}>Complete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="subsection">
        <h3>Audit Trail</h3>
        <table className="table">
          <tbody>
            {defect.auditEvents?.map((event: any) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{event.eventType}</td>
                <td>{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
