"use client";

import { useMemo, useState } from "react";
import { exGstFromInc, gstFromInc } from "@/lib/gst";
import { frequencyLabel, maintenanceChecklist } from "@/lib/maintenanceChecklist";

const today = new Date().toISOString().slice(0, 10);

export default function SimplifiedTaskRegister() {
  const [templateCode, setTemplateCode] = useState("");
  const selectedTemplate = maintenanceChecklist.find((item) => item.code === templateCode);

  const [taskTitle, setTaskTitle] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("AS_REQUIRED");
  const [responsibleParty, setResponsibleParty] = useState("CARETAKER");
  const [dueDate, setDueDate] = useState(today);
  const [assignedContractor, setAssignedContractor] = useState("");
  const [amountIncGst, setAmountIncGst] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [requiredWork, setRequiredWork] = useState("");

  const amount = Number(amountIncGst || 0);
  const gst = useMemo(() => gstFromInc(amount), [amount]);
  const exGst = useMemo(() => exGstFromInc(amount), [amount]);

  function applyTemplate(code: string) {
    setTemplateCode(code);
    const item = maintenanceChecklist.find((template) => template.code === code);
    if (!item) return;

    setTaskTitle(item.service);
    setCategory(item.category);
    setFrequency(item.frequency);
    setResponsibleParty(item.responsibleParty);
    setEvidenceRequired(item.evidenceRequired);
    setRequiredWork(item.checklist.join("\n"));
  }

  function copyPayload() {
    const payload = {
      taskTitle,
      category,
      frequency,
      responsibleParty,
      dueDate,
      assignedContractor,
      amountIncGst: amount,
      gst,
      exGst,
      status,
      evidenceRequired,
      requiredWork: requiredWork.split("\n").map((line) => line.trim()).filter(Boolean)
    };

    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  }

  return (
    <main className="essential-register-shell">
      <header className="essential-register-header">
        <span>Dakabin Crossing</span>
        <h1>Essential Task Register</h1>
        <p>Only the fields needed to create, assign, cost and evidence a maintenance task.</p>
      </header>

      <section className="essential-card">
        <label>
          Maintenance template
          <select value={templateCode} onChange={(event) => applyTemplate(event.target.value)}>
            <option value="">Manual task / defect</option>
            {maintenanceChecklist.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.service}
              </option>
            ))}
          </select>
        </label>

        {selectedTemplate ? (
          <div className="template-summary">
            <strong>{frequencyLabel(selectedTemplate.frequency)}</strong>
            <span>{selectedTemplate.category} | {selectedTemplate.responsibleParty.replace("_", " ")}</span>
          </div>
        ) : null}

        <div className="essential-grid">
          <label>
            Task title
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Example: Garage door maintenance" />
          </label>

          <label>
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Example: Building maintenance" />
          </label>

          <label>
            Frequency
            <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
              <option value="AS_REQUIRED">As required</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="FOUR_MONTHLY">4 monthly</option>
              <option value="SIX_MONTHLY">6 monthly</option>
              <option value="ANNUAL">Annual</option>
              <option value="COLLECTION_DAYS">Collection days</option>
            </select>
          </label>

          <label>
            Responsible party
            <select value={responsibleParty} onChange={(event) => setResponsibleParty(event.target.value)}>
              <option value="CARETAKER">Caretaker</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="PROPERTY_MANAGER">Property manager</option>
            </select>
          </label>

          <label>
            Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>

          <label>
            Assigned contractor
            <input value={assignedContractor} onChange={(event) => setAssignedContractor(event.target.value)} placeholder="Optional" />
          </label>

          <label>
            Amount inc GST
            <input inputMode="decimal" value={amountIncGst} onChange={(event) => setAmountIncGst(event.target.value)} placeholder="$0.00" />
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On hold</option>
            </select>
          </label>
        </div>

        <div className="gst-summary">
          <div>
            <span>Ex GST</span>
            <strong>${exGst.toFixed(2)}</strong>
          </div>
          <div>
            <span>GST auto</span>
            <strong>${gst.toFixed(2)}</strong>
          </div>
          <div>
            <span>Inc GST</span>
            <strong>${amount.toFixed(2)}</strong>
          </div>
        </div>

        <label>
          Required work / checklist
          <textarea value={requiredWork} onChange={(event) => setRequiredWork(event.target.value)} rows={6} placeholder="One required action per line" />
        </label>

        <label className="checkbox-line">
          <input type="checkbox" checked={evidenceRequired} onChange={(event) => setEvidenceRequired(event.target.checked)} />
          Evidence required
        </label>

        <details>
          <summary>Advanced details</summary>
          <div className="advanced-note">
            Keep quote links, invoice links, approval notes, internal notes and dispute details here instead of overwhelming the core register.
          </div>
        </details>

        <div className="essential-actions">
          <button onClick={copyPayload}>Copy task payload</button>
          <a href="/maintenance-calendar">View maintenance calendar</a>
        </div>
      </section>
    </main>
  );
}
