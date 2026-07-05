"use client";

import { useMemo, useState } from "react";

type AnyTask = any;
type Scheme = any;

function statusClass(status: string) {
  if (status === "PASS") return "pass";
  if (status === "WARNING") return "warning";
  if (status === "BLOCKED") return "blocked";
  return "pending";
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function TaskWorkspace({ initialTasks, schemes }: { initialTasks: AnyTask[]; schemes: Scheme[] }) {
  const [tasks, setTasks] = useState<AnyTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(initialTasks[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const selected = tasks.find((t) => t.id === selectedId) ?? tasks[0] ?? null;

  const metrics = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      due: tasks.filter((t) => t.dueDate && !["COMPLETED", "NOT_REQUIRED"].includes(t.status) && new Date(t.dueDate) <= new Date()).length,
      action: tasks.filter((t) => t.followUpRequired || t.status === "NEEDS_FOLLOW_UP" || t.status === "ESCALATED_TO_COMMITTEE").length,
      blocked: tasks.filter((t) => t.financialControl?.paymentStatus === "BLOCKED").length,
      warning: tasks.filter((t) => t.financialControl?.paymentStatus === "WARNING").length
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const fc = t.financialControl;
      const blob = [
        t.taskCode,
        t.areaAsset,
        t.category,
        t.requirement,
        t.responsibleParty,
        t.status,
        fc?.quoteContractor,
        fc?.quoteNumber,
        fc?.invoiceContractor,
        fc?.invoiceNumber,
        fc?.paymentStatus,
        fc?.paymentBlockReason
      ].join(" ").toLowerCase();

      return (!q || blob.includes(q)) && (!paymentFilter || fc?.paymentStatus === paymentFilter);
    });
  }, [tasks, query, paymentFilter]);

  async function refresh() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks);
  }

  async function createTask() {
    const schemeId = schemes[0]?.id;
    if (!schemeId) {
      alert("Create a scheme first using Prisma seed or database.");
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemeId })
    });
    const data = await res.json();
    await refresh();
    setSelectedId(data.task.id);
  }

  async function saveTask(formData: FormData) {
    if (!selected) return;
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(`/api/tasks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Save failed");
      return;
    }

    await refresh();
  }

  async function stampActioned() {
    if (!selected) return;
    const res = await fetch(`/api/tasks/${selected.id}/stamp-actioned`, { method: "POST" });
    if (!res.ok) alert("Failed to stamp actioned.");
    await refresh();
  }

  async function uploadFiles(formData: FormData) {
    if (!selected) return;
    const res = await fetch(`/api/tasks/${selected.id}/files`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Upload failed");
    }
    await refresh();
  }

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Caretaker Compliance Pro</h1>
          <p>Body corporate task evidence, document control, quote vs invoice matching, and payment blocking.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => window.print()}>Print</button>
          <button className="secondary" onClick={refresh}>Refresh</button>
          <button onClick={createTask}>New Task</button>
        </div>
      </header>

      <section className="dashboard">
        <div className="metric"><span>Total Tasks</span><strong>{metrics.total}</strong></div>
        <div className="metric"><span>Completed</span><strong>{metrics.completed}</strong></div>
        <div className="metric warning"><span>Due / Overdue</span><strong>{metrics.due}</strong></div>
        <div className="metric danger"><span>Needs Action</span><strong>{metrics.action}</strong></div>
        <div className="metric danger"><span>Payment Blocked</span><strong>{metrics.blocked}</strong></div>
        <div className="metric warning"><span>Financial Warnings</span><strong>{metrics.warning}</strong></div>
      </section>

      <main className="layout">
        <aside className="panel register-panel">
          <div className="panel-title">
            <h2>Task Register</h2>
            <span className="badge">{filtered.length}</span>
          </div>

          <label className="field">
            <span>Search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Task, contractor, quote, invoice..." />
          </label>

          <label className="field">
            <span>Financial Control</span>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="">All</option>
              <option value="PASS">Pass</option>
              <option value="WARNING">Warning</option>
              <option value="BLOCKED">Blocked</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>

          <div className="task-list">
            {filtered.map((t) => {
              const fc = t.financialControl;
              const pay = fc?.paymentStatus ?? "PENDING";
              return (
                <div
                  key={t.id}
                  className={`task-card ${selected?.id === t.id ? "active" : ""} ${pay === "BLOCKED" ? "blocked" : pay === "WARNING" ? "warning" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <h4>{t.taskCode} · {t.areaAsset}</h4>
                  <p>{t.category} · {t.frequency} · {t.responsibleParty ?? "Unassigned"}</p>
                  <span className="pill">{t.status.replaceAll("_", " ")}</span>
                  <span className={`pill ${statusClass(pay)}`}>{pay}</span>
                  <p>{fc?.paymentBlockReason ?? "No financial control assessment."}</p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="panel">
          {!selected ? (
            <p>No task selected.</p>
          ) : (
            <TaskDetail
              task={selected}
              schemes={schemes}
              onSave={saveTask}
              onStampActioned={stampActioned}
              onUploadFiles={uploadFiles}
            />
          )}
        </section>
      </main>
    </>
  );
}

function TaskDetail({
  task,
  schemes,
  onSave,
  onStampActioned,
  onUploadFiles
}: {
  task: AnyTask;
  schemes: Scheme[];
  onSave: (formData: FormData) => void;
  onStampActioned: () => void;
  onUploadFiles: (formData: FormData) => void;
}) {
  const fc = task.financialControl ?? {};
  const pay = fc.paymentStatus ?? "PENDING";

  return (
    <>
      <div className="detail-head">
        <div>
          <h2>{task.taskCode} · {task.areaAsset}</h2>
          <p className="muted">Updated {new Date(task.updatedAt).toLocaleString()}</p>
        </div>
        <div className="row-actions">
          <button className="secondary" onClick={onStampActioned}>Stamp Actioned</button>
        </div>
      </div>

      <section className="record-banner">
        <div><span>Scheme</span><strong>{task.scheme?.name}</strong></div>
        <div><span>Status</span><strong>{task.status.replaceAll("_", " ")}</strong></div>
        <div><span>Evidence Files</span><strong>{task.documents?.length ?? 0}</strong></div>
        <div><span>Payment</span><strong>{pay}</strong></div>
      </section>

      <form action={onSave}>
        <div className="grid.two"></div>
        <div className="grid two">
          <label className="field">
            <span>Scheme</span>
            <select name="schemeId" defaultValue={task.schemeId}>
              {schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Requirement Reference</span>
            <input name="requirementRef" defaultValue={task.requirementRef ?? ""} />
          </label>

          <label className="field">
            <span>Category</span>
            <input name="category" defaultValue={task.category} />
          </label>

          <label className="field">
            <span>Frequency</span>
            <input name="frequency" defaultValue={task.frequency} />
          </label>

          <label className="field">
            <span>Area / Asset</span>
            <input name="areaAsset" defaultValue={task.areaAsset} />
          </label>

          <label className="field">
            <span>Responsible Party</span>
            <input name="responsibleParty" defaultValue={task.responsibleParty ?? ""} />
          </label>
        </div>

        <label className="field">
          <span>Requirement / Duty</span>
          <textarea name="requirement" rows={3} defaultValue={task.requirement} />
        </label>

        <div className="grid three">
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue={task.status}>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIONED">Actioned</option>
              <option value="COMPLETED">Completed</option>
              <option value="NEEDS_FOLLOW_UP">Needs Follow-up</option>
              <option value="ESCALATED_TO_COMMITTEE">Escalated to Committee</option>
              <option value="NOT_REQUIRED">Not Required</option>
            </select>
          </label>

          <label className="field">
            <span>Priority</span>
            <select name="priority" defaultValue={task.priority}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>

          <label className="field">
            <span>Due Date</span>
            <input name="dueDate" type="date" defaultValue={task.dueDate?.slice(0, 10) ?? ""} />
          </label>
        </div>

        <section className="subsection">
          <h3>Quote vs Invoice Financial Control</h3>
          <div className={`financial-alert ${pay}`}>
            {pay}: {fc.paymentBlockReason ?? "Not assessed"}
          </div>

          <div className="summary-grid">
            <div className="summary-box"><span>Variance $</span><strong>{money(fc.varianceAmount)}</strong></div>
            <div className="summary-box"><span>Variance %</span><strong>{Number(fc.variancePercent ?? 0).toFixed(2)}%</strong></div>
            <div className="summary-box"><span>GST Check</span><strong>{fc.gstCheckStatus ?? "Not assessed"}</strong></div>
            <div className="summary-box"><span>Duplicate Invoice</span><strong>{fc.duplicateInvoiceStatus ?? "Not checked"}</strong></div>
          </div>

          <div className="grid three">
            <label className="field"><span>Quote Contractor</span><input name="quoteContractor" defaultValue={fc.quoteContractor ?? ""} /></label>
            <label className="field"><span>Quote Number</span><input name="quoteNumber" defaultValue={fc.quoteNumber ?? ""} /></label>
            <label className="field"><span>Quote Date</span><input type="date" name="quoteDate" defaultValue={fc.quoteDate?.slice(0, 10) ?? ""} /></label>
            <label className="field"><span>Quote Ex GST</span><input type="number" step="0.01" name="quoteAmountExGst" defaultValue={fc.quoteAmountExGst ?? ""} /></label>
            <label className="field"><span>Quote GST</span><input type="number" step="0.01" name="quoteGst" defaultValue={fc.quoteGst ?? ""} /></label>
            <label className="field"><span>Quote Total Inc GST</span><input type="number" step="0.01" name="quoteTotalIncGst" defaultValue={fc.quoteTotalIncGst ?? ""} /></label>

            <label className="field"><span>Invoice Contractor</span><input name="invoiceContractor" defaultValue={fc.invoiceContractor ?? ""} /></label>
            <label className="field"><span>Invoice Number</span><input name="invoiceNumber" defaultValue={fc.invoiceNumber ?? ""} /></label>
            <label className="field"><span>Invoice Date</span><input type="date" name="invoiceDate" defaultValue={fc.invoiceDate?.slice(0, 10) ?? ""} /></label>
            <label className="field"><span>Invoice Ex GST</span><input type="number" step="0.01" name="invoiceAmountExGst" defaultValue={fc.invoiceAmountExGst ?? ""} /></label>
            <label className="field"><span>Invoice GST</span><input type="number" step="0.01" name="invoiceGst" defaultValue={fc.invoiceGst ?? ""} /></label>
            <label className="field"><span>Invoice Total Inc GST</span><input type="number" step="0.01" name="invoiceTotalIncGst" defaultValue={fc.invoiceTotalIncGst ?? ""} /></label>

            <label className="field"><span>Allowed Variance %</span><input type="number" step="0.01" name="allowedVariancePercent" defaultValue={fc.allowedVariancePercent ?? 0} /></label>
            <label className="field"><span>Allowed Variance $</span><input type="number" step="0.01" name="allowedVarianceAmount" defaultValue={fc.allowedVarianceAmount ?? 0} /></label>
            <label className="field">
              <span>Variation Approved?</span>
              <select name="variationApproved" defaultValue={fc.variationApproved ? "true" : "false"}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Variation Notes</span>
            <textarea name="variationNotes" rows={3} defaultValue={fc.variationNotes ?? ""} />
          </label>
        </section>

        <section className="subsection">
          <h3>Outcome / Follow-up</h3>
          <label className="field">
            <span>Action Taken</span>
            <textarea name="actionTaken" rows={3} defaultValue={task.actionTaken ?? ""} />
          </label>
          <label className="field">
            <span>Exception Notes</span>
            <textarea name="exceptionNotes" rows={3} defaultValue={task.exceptionNotes ?? ""} />
          </label>
          <label className="field">
            <span>Follow-up Notes</span>
            <textarea name="followUpNotes" rows={3} defaultValue={task.followUpNotes ?? ""} />
          </label>
        </section>

        <button type="submit">Save Record & Recalculate</button>
      </form>

      <section className="subsection">
        <h3>Upload Evidence / Documents</h3>
        <form action={onUploadFiles}>
          <div className="grid three">
            <label className="field">
              <span>Document Category</span>
              <select name="category">
                <option value="PHOTO_EVIDENCE">Photo Evidence</option>
                <option value="QUOTE">Quote</option>
                <option value="INVOICE">Invoice</option>
                <option value="VARIATION_APPROVAL">Variation Approval</option>
                <option value="COMMITTEE_APPROVAL">Committee Approval</option>
                <option value="CONTRACTOR_REPORT">Contractor Report</option>
                <option value="COMPLIANCE_CERTIFICATE">Compliance Certificate</option>
                <option value="EMAIL_EVIDENCE">Email Evidence</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Visibility</span>
              <select name="visibility">
                <option value="COMMITTEE_ONLY">Committee Only</option>
                <option value="OWNER_VISIBLE">Owner Visible</option>
                <option value="INTERNAL_ONLY">Internal Only</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </label>
            <label className="field">
              <span>Files</span>
              <input name="files" type="file" multiple />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <input name="notes" placeholder="e.g. before photo, approved quote, contractor invoice..." />
          </label>
          <button type="submit">Upload Files</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Category</th>
              <th>Visibility</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {task.documents?.map((d: any) => (
              <tr key={d.id}>
                <td><a href={d.storagePath} target="_blank">{d.originalName}</a><br /><span className="muted">{d.notes}</span></td>
                <td>{d.category.replaceAll("_", " ")}</td>
                <td>{d.visibility.replaceAll("_", " ")}</td>
                <td>{new Date(d.uploadedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="subsection">
        <h3>Checklist</h3>
        <table className="table">
          <tbody>
            {task.checklistItems?.map((i: any) => (
              <tr key={i.id}>
                <td>{i.done ? "✓" : "○"}</td>
                <td>{i.text}</td>
                <td>{i.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="subsection">
        <h3>Audit Trail</h3>
        <table className="table">
          <tbody>
            {task.auditEvents?.map((a: any) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.eventType}</td>
                <td>{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
