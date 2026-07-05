"use client";

import { useMemo, useState } from "react";

type AnyTask = any;
type Scheme = any;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function statusClass(status: string) {
  if (status === "PASS") return "pass";
  if (status === "WARNING") return "warning";
  if (status === "BLOCKED") return "blocked";
  return "pending";
}

function taskStatusLabel(status: string) {
  return String(status || "").replaceAll("_", " ");
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function isoDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function displayDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

function getPaymentStatus(task: AnyTask) {
  return task?.financialControl?.paymentStatus ?? "PENDING";
}

function needsCommitteeAction(task: AnyTask) {
  const pay = getPaymentStatus(task);
  return (
    task.committeeApprovalRequired ||
    task.followUpRequired ||
    task.status === "NEEDS_FOLLOW_UP" ||
    task.status === "ESCALATED_TO_COMMITTEE" ||
    pay === "BLOCKED" ||
    pay === "WARNING"
  );
}

function evidenceCount(task: AnyTask) {
  return task.documents?.length ?? 0;
}

function isMissingEvidence(task: AnyTask) {
  return ["ACTIONED", "COMPLETED"].includes(task.status) && evidenceCount(task) === 0;
}

function isOverdue(task: AnyTask) {
  if (!task.dueDate) return false;
  if (["COMPLETED", "NOT_REQUIRED"].includes(task.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function calendarItemClass(task: AnyTask) {
  if (getPaymentStatus(task) === "BLOCKED") return "cal-blocked";
  if (needsCommitteeAction(task)) return "cal-committee";
  if (isOverdue(task)) return "cal-overdue";
  if (task.status === "COMPLETED") return "cal-completed";
  if (task.status === "ACTIONED") return "cal-actioned";
  return "cal-scheduled";
}

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const days = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function TaskWorkspace({ initialTasks, schemes }: { initialTasks: AnyTask[]; schemes: Scheme[] }) {
  const [tasks, setTasks] = useState<AnyTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<string | null>(initialTasks[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [taskView, setTaskView] = useState<"active" | "voided" | "all">("active");
  const [activeTab, setActiveTab] = useState<"calendar" | "tasks">("calendar");

  async function reloadTasks(view: "active" | "voided" | "all" = taskView) {
    const res = await fetch(`/api/tasks?view=${view}`);
    const data = await res.json();
    setTasks(data.tasks);
  }
  return (
    <>
      <header className="app-header">
        <div>
          <h1>Caretaker Compliance Pro</h1>
          <p>Body corporate maintenance calendar, evidence folders, task control, and quote vs invoice matching.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => setActiveTab("calendar")}>Calendar</button>
          <button className="secondary" onClick={() => setActiveTab("tasks")}>Task Register</button>
          <button className="secondary" onClick={() => reloadTasks()}>Refresh</button>
          <button onClick={createTask}>New Task</button>
        </div>
      </header>

      <section className="dashboard">
        <div className="metric"><span>Total Tasks</span><strong>{metrics.total}</strong></div>
        <div className="metric"><span>Completed</span><strong>{metrics.completed}</strong></div>
        <div className="metric warning"><span>Due / Overdue</span><strong>{metrics.due}</strong></div>
        <div className="metric danger"><span>Committee Action</span><strong>{metrics.action}</strong></div>
        <div className="metric danger"><span>Payment Blocked</span><strong>{metrics.blocked}</strong></div>
        <div className="metric warning"><span>Evidence Missing</span><strong>{metrics.missingEvidence}</strong></div>
      </section>

      {activeTab === "calendar" ? (
        <main className="calendar-layout">
          <section className="panel calendar-panel">
            <div className="calendar-toolbar">
              <div className="inline">
                <button className="secondary" onClick={thisMonth}>Today</button>
                <button className="secondary" onClick={prevMonth}>‹</button>
                <button className="secondary" onClick={nextMonth}>›</button>
                <h2>{MONTHS[calendarMonth]} {calendarYear}</h2>
              </div>
              <div className="legend">
                <span className="legend-dot cal-scheduled"></span> Scheduled
                <span className="legend-dot cal-completed"></span> Completed
                <span className="legend-dot cal-committee"></span> Committee
                <span className="legend-dot cal-blocked"></span> Payment blocked
              </div>
            </div>

            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="calendar-day-name">{d}</div>
              ))}

              {calendarDays.map((day) => {
                const key = day.toISOString().slice(0, 10);
                const dayTasks = tasksByDate.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === calendarMonth;
                const isSelected = key === selectedDate;
                const driveFolder = dayTasks.find((t) => t.dayDriveFolderUrl)?.dayDriveFolderUrl;

                return (
                  <div
                    key={key}
                    className={`calendar-cell ${!isCurrentMonth ? "muted-cell" : ""} ${isSelected ? "selected-cell" : ""}`}
                    onClick={() => setSelectedDate(key)}
                  >
                    <div className="calendar-cell-head">
                      <strong>{day.getDate()}</strong>
                      {driveFolder && (
                        <a
                          href={driveFolder}
                          target="_blank"
                          rel="noreferrer"
                          className="drive-link"
                          onClick={(e) => e.stopPropagation()}
                          title="Open day evidence folder"
                        >
                          📁
                        </a>
                      )}
                    </div>
                    <div className="calendar-items">
                      {dayTasks.slice(0, 4).map((task) => (
                        <button
                          type="button"
                          key={task.id}
                          className={`calendar-item ${calendarItemClass(task)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(task.id);
                            setSelectedDate(key);
                          }}
                        >
                          {task.areaAsset}
                        </button>
                      ))}
                      {dayTasks.length > 4 && <span className="more-items">+{dayTasks.length - 4} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="panel day-panel">
            <div className="panel-title">
              <div>
                <h2>{new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
                <p className="muted">{selectedDateTasks.length} task(s) due</p>
              </div>
            </div>

            <div className="row-actions">
              {selectedDateFolder ? (
                <a href={selectedDateFolder} target="_blank" rel="noreferrer" className="button-link">Open Day Evidence Folder</a>
              ) : (
                <span className="muted">No day folder linked</span>
              )}
              <button onClick={createTask}>Add Task</button>
            </div>

            <div className="day-task-list">
              {selectedDateTasks.length === 0 ? (
                <p className="muted">No tasks due on this date.</p>
              ) : (
                selectedDateTasks.map((task) => {
                  const fc = task.financialControl;
                  const pay = getPaymentStatus(task);
                  return (
                    <div key={task.id} className="day-task-card">
                      <div className="day-task-title">
                        <strong>{task.taskCode} · {task.areaAsset}</strong>
                        <span className={`pill ${statusClass(pay)}`}>{pay}</span>
                    {t.isDeleted && <span className="pill voided">VOIDED</span>}
                      </div>
                      <p>{task.category} · {task.responsibleParty ?? "Unassigned"}</p>
                      <p><strong>Company:</strong> {task.contractorCompany || fc?.quoteContractor || "Not set"}</p>
                      <p><strong>Status:</strong> {taskStatusLabel(task.status)}</p>
                      <p><strong>Quote:</strong> {money(fc?.quoteTotalIncGst)} · <strong>Invoice:</strong> {money(fc?.invoiceTotalIncGst)}</p>
                      <p><strong>Evidence:</strong> {evidenceCount(task)} file(s)</p>
                      {fc?.paymentBlockReason && <p className="warning-text">{fc.paymentBlockReason}</p>}
                      <div className="row-actions">
                        {task.taskDriveFolderUrl && <a href={task.taskDriveFolderUrl} target="_blank" rel="noreferrer" className="button-link secondary-link">Task Folder</a>}
                        {task.photoFolderUrl && <a href={task.photoFolderUrl} target="_blank" rel="noreferrer" className="button-link secondary-link">Photo Folder</a>}
                        <button className="secondary" onClick={() => { setSelectedId(task.id); setActiveTab("tasks"); }}>Open Task</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </main>
      ) : (
        <main className="layout">
          <aside className="panel register-panel">
            <div className="panel-title">
              <h2>Task Register</h2>
              <span className="badge">{filtered.length}</span>
            </div>

            <label className="field">
              <span>Search</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Task, contractor, quote, invoice, Drive link..." />
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

            <label className="field">
              <span>Task View</span>
              <select
                value={taskView}
                onChange={async (e) => {
                  const nextView = e.target.value as "active" | "voided" | "all";
                  setTaskView(nextView);
                  await reloadTasks(nextView);
                }}
              >
                <option value="active">Active Schedule</option>
                <option value="voided">Voided Tasks</option>
                <option value="all">All Tasks</option>
              </select>
            </label>

            <div className="task-list">
              {filtered.map((t) => {
                const fc = t.financialControl;
                const pay = fc?.paymentStatus ?? "PENDING";
                return (
                  <div
                    key={t.id}
                    className={`task-card ${selected?.id === t.id ? "active" : ""} ${t.isDeleted ? "voided-card" : ""} ${pay === "BLOCKED" ? "blocked" : pay === "WARNING" ? "warning" : ""}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <h4>{t.taskCode} · {t.areaAsset}</h4>
                    <p>{t.category} · {t.frequency} · {t.responsibleParty ?? "Unassigned"}</p>
                    <span className="pill">{taskStatusLabel(t.status)}</span>
                    <span className={`pill ${statusClass(pay)}`}>{pay}</span>
                    {t.isDeleted && <span className="pill voided">VOIDED</span>}
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
                onVoidTask={voidTask}
                onRestoreTask={restoreTask}
              />
            )}
          </section>
        </main>
      )}
    </>
  );
}

function TaskDetail({
  task,
  schemes,
  onSave,
  onStampActioned,
  onUploadFiles,
  onVoidTask,
  onRestoreTask
}: {
  task: AnyTask;
  schemes: Scheme[];
  onSave: (formData: FormData) => void;
  onStampActioned: () => void;
  onUploadFiles: (formData: FormData) => void;
  onVoidTask: (taskId: string) => void;
  onRestoreTask: (taskId: string) => void;
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
          {task.isDeleted ? (
            <button className="secondary" onClick={() => onRestoreTask(task.id)}>Restore Task</button>
          ) : (
            <button className="danger" onClick={() => onVoidTask(task.id)}>Void Task</button>
          )}
        </div>
      </div>

      <section className="record-banner">
        <div><span>Scheme</span><strong>{task.scheme?.name}</strong></div>
        <div><span>Status</span><strong>{taskStatusLabel(task.status)}</strong></div>
        <div><span>Evidence Files</span><strong>{task.documents?.length ?? 0}</strong></div>
        <div><span>Payment</span><strong>{pay}</strong></div>
      </section>

      {task.isDeleted && (
        <section className="voided-banner">
          <strong>VOIDED TASK</strong>
          <span>{task.deletedReason ?? "No reason recorded."}</span>
          <span>{task.deletedAt ? `Voided ${new Date(task.deletedAt).toLocaleString()}` : ""}</span>
        </section>
      )}

      <form action={onSave}>
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
            <select name="frequency" defaultValue={task.frequency}>
              <option>Ad hoc</option>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Fortnightly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Annual</option>
            </select>
          </label>

          <label className="field">
            <span>Area / Asset</span>
            <input name="areaAsset" defaultValue={task.areaAsset} />
          </label>

          <label className="field">
            <span>Responsible Party</span>
            <input name="responsibleParty" defaultValue={task.responsibleParty ?? ""} />
          </label>

          <label className="field">
            <span>Contractor / Company Completing Task</span>
            <input name="contractorCompany" defaultValue={task.contractorCompany ?? ""} />
          </label>

          <label className="field">
            <span>Due Date</span>
            <input name="dueDate" type="date" defaultValue={isoDate(task.dueDate)} />
          </label>

          <label className="field">
            <span>Start Time</span>
            <input name="startTime" type="time" defaultValue={task.startTime ?? ""} />
          </label>

          <label className="field">
            <span>End Time</span>
            <input name="endTime" type="time" defaultValue={task.endTime ?? ""} />
          </label>

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
        </div>

        <label className="field">
          <span>Requirement / Duty</span>
          <textarea name="requirement" rows={3} defaultValue={task.requirement} />
        </label>

        <section className="subsection">
          <h3>Google Drive Evidence Folders</h3>
          <div className="grid two">
            <label className="field">
              <span>Day Evidence Folder URL</span>
              <input name="dayDriveFolderUrl" defaultValue={task.dayDriveFolderUrl ?? ""} placeholder="Google Drive folder for this date" />
            </label>
            <label className="field">
              <span>Task Evidence Folder URL</span>
              <input name="taskDriveFolderUrl" defaultValue={task.taskDriveFolderUrl ?? ""} placeholder="Google Drive folder for this task" />
            </label>
            <label className="field">
              <span>Photo Evidence Folder URL</span>
              <input name="photoFolderUrl" defaultValue={task.photoFolderUrl ?? ""} placeholder="Google Drive photos folder" />
            </label>
            <label className="field">
              <span>Documents Folder URL</span>
              <input name="documentFolderUrl" defaultValue={task.documentFolderUrl ?? ""} placeholder="Google Drive documents folder" />
            </label>
          </div>
          <div className="row-actions">
            {task.dayDriveFolderUrl && <a className="button-link" href={task.dayDriveFolderUrl} target="_blank" rel="noreferrer">Open Day Folder</a>}
            {task.taskDriveFolderUrl && <a className="button-link" href={task.taskDriveFolderUrl} target="_blank" rel="noreferrer">Open Task Folder</a>}
            {task.photoFolderUrl && <a className="button-link" href={task.photoFolderUrl} target="_blank" rel="noreferrer">Open Photos</a>}
            {task.documentFolderUrl && <a className="button-link" href={task.documentFolderUrl} target="_blank" rel="noreferrer">Open Documents</a>}
          </div>
        </section>

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
