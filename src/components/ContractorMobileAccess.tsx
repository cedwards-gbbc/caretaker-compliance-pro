"use client";

import { useEffect, useMemo, useState } from "react";

type Contractor = {
  id: string;
  companyName: string;
  websiteUrl: string;
  logoUrl?: string | null;
  companyPhone: string;
  tradeType?: string | null;
};

type Task = {
  id: string;
  code?: string | null;
  taskCode?: string | null;
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  status?: string | null;
  location?: string | null;
  frequency?: string | null;
  category?: string | null;
  priority?: string | null;
  contractorCompany?: string | null;
  evidenceFolderUrl?: string | null;
  dayFolderUrl?: string | null;
  notes?: string | null;
  scopeOfWork?: string | null;
  requiredActions?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function taskCode(task: Task) {
  return task.code || task.taskCode || "Task";
}

function taskTitle(task: Task) {
  return task.title || task.description || "Assigned contractor task";
}

function taskRequirementLines(task: Task) {
  const source = task.requiredActions || task.scopeOfWork || task.notes || task.description || "";
  return String(source)
    .split(/\n|\r|;|•|-/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function ContractorMobileAccess() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Contractor | null>(null);
  const [companyPhone, setCompanyPhone] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("contractor.accessToken") ?? "";
    const savedCompany = window.localStorage.getItem("contractor.company");
    if (savedToken) setAccessToken(savedToken);
    if (savedCompany) {
      try {
        setSelected(JSON.parse(savedCompany));
      } catch {
        window.localStorage.removeItem("contractor.company");
      }
    }

    fetch("/api/contractors")
      .then((res) => res.json())
      .then((data) => setContractors(data.contractors ?? []))
      .catch(() => setContractors([]));
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    fetch(`/api/contractor-access/tasks?token=${encodeURIComponent(accessToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          logout();
          return;
        }
        setTasks(data.tasks ?? []);
      })
      .catch(() => setError("Could not load contractor tasks."));
  }, [accessToken]);

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, Task[]>>((acc, task) => {
      const key = task.dueDate ? task.dueDate.slice(0, 10) : "No due date";
      acc[key] = acc[key] || [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  async function verifyAccess() {
    if (!selected) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contractor-access/verify", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          companyId: selected.id,
          companyPhone,
          pinCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Access failed.");
        return;
      }

      setAccessToken(data.accessToken);
      window.localStorage.setItem("contractor.accessToken", data.accessToken);
      window.localStorage.setItem("contractor.company", JSON.stringify(data.company));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setAccessToken("");
    setTasks([]);
    setSelectedTask(null);
    setCompanyPhone("");
    setPinCode("");
    window.localStorage.removeItem("contractor.accessToken");
    window.localStorage.removeItem("contractor.company");
  }

  if (accessToken && selected) {
    return (
      <main className="contractor-shell">
        <header className="contractor-header">
          <div className="contractor-logo-small">
            {selected.logoUrl ? <img src={selected.logoUrl} alt={`${selected.companyName} logo`} /> : selected.companyName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span>Verified contractor access</span>
            <h1>{selected.companyName}</h1>
          </div>
          <button className="secondary" onClick={logout}>Exit</button>
        </header>

        <section className="contractor-summary">
          <strong>{tasks.length}</strong>
          <span>assigned task(s)</span>
        </section>

        {selectedTask ? (
          <section className="contractor-job-detail">
            <button className="secondary" onClick={() => setSelectedTask(null)}>← Back to assigned tasks</button>

            <div className="contractor-job-heading">
              <span>{taskCode(selectedTask)}</span>
              <h2>{taskTitle(selectedTask)}</h2>
              <p>{formatDate(selectedTask.dueDate)}</p>
            </div>

            <div className="contractor-job-meta">
              <div>
                <span>Status</span>
                <strong>{selectedTask.status ?? "Pending"}</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>{selectedTask.priority ?? "Normal"}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{selectedTask.location ?? "Not specified"}</strong>
              </div>
            </div>

            <div className="contractor-job-section">
              <h3>Required work / checklist</h3>
              {taskRequirementLines(selectedTask).length === 0 ? (
                <p>No task instructions have been added yet.</p>
              ) : (
                <ul>
                  {taskRequirementLines(selectedTask).map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="contractor-job-section">
              <h3>Evidence required</h3>
              <p>Upload photos, notes or completion evidence against this job before marking it complete.</p>
              {selectedTask.dayFolderUrl || selectedTask.evidenceFolderUrl ? (
                <a className="contractor-link-button" href={selectedTask.dayFolderUrl || selectedTask.evidenceFolderUrl || "#"} target="_blank" rel="noreferrer">
                  Open evidence folder
                </a>
              ) : (
                <p className="contractor-muted">No evidence folder linked yet.</p>
              )}
            </div>

            <div className="contractor-job-actions">
              <button>Upload Evidence</button>
              <button className="secondary">Add Note</button>
              <button className="secondary">Mark Complete</button>
            </div>
          </section>
        ) : null}

        {!selectedTask ? (
        <section className="contractor-task-list">
          {tasks.length === 0 ? (
            <div className="contractor-empty">No assigned tasks found.</div>
          ) : (
            Object.entries(groupedTasks).map(([date, items]) => (
              <div key={date} className="contractor-day">
                <h2>{date === "No due date" ? date : formatDate(date)}</h2>
                {items.map((task) => (
                  <article key={task.id} className="contractor-task-card" onClick={() => setSelectedTask(task)} role="button" tabIndex={0}>
                    <div className="contractor-task-top">
                      <strong>{taskCode(task)}</strong>
                      <span>{task.status ?? "Pending"}</span>
                    </div>
                    <h3>{taskTitle(task)}</h3>
                    {task.location ? <p>{task.location}</p> : null}
                    <button className="secondary" onClick={(event) => { event.stopPropagation(); setSelectedTask(task); }}>Open Job</button>
                  </article>
                ))}
              </div>
            ))
          )}
        </section>
        ) : null}
      </main>
    );
  }

  return (
    <main className="contractor-shell">
      <header className="contractor-hero">
        <span>Caretaker Compliance Pro</span>
        <h1>Contractor Access</h1>
        <p>Select your company, confirm the company phone number, then enter the job PIN provided by the caretaker.</p>
      </header>

      {!selected ? (
        <section className="contractor-company-grid">
          {contractors.length === 0 ? (
            <div className="contractor-empty">No contractor companies have been added yet.</div>
          ) : (
            contractors.map((company) => (
              <button key={company.id} className="contractor-company-card" onClick={() => setSelected(company)}>
                <div className="contractor-logo">
                  {company.logoUrl ? <img src={company.logoUrl} alt={`${company.companyName} logo`} /> : company.companyName.slice(0, 2).toUpperCase()}
                </div>
                <strong>{company.companyName}</strong>
                {company.tradeType ? <span>{company.tradeType}</span> : null}
              </button>
            ))
          )}
        </section>
      ) : (
        <section className="contractor-login-card">
          <button className="secondary" onClick={() => setSelected(null)}>← Change company</button>

          <div className="contractor-selected-company">
            <div className="contractor-logo">
              {selected.logoUrl ? <img src={selected.logoUrl} alt={`${selected.companyName} logo`} /> : selected.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span>Selected company</span>
              <strong>{selected.companyName}</strong>
            </div>
          </div>

          <label>
            Company phone number
            <input
              value={companyPhone}
              onChange={(event) => setCompanyPhone(event.target.value)}
              placeholder="Example: 1300 354 722"
              inputMode="tel"
            />
          </label>

          <label>
            Job PIN
            <input
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value)}
              placeholder="6-digit PIN"
              inputMode="numeric"
            />
          </label>

          {error ? <p className="contractor-error">{error}</p> : null}

          <button onClick={verifyAccess} disabled={loading}>
            {loading ? "Checking..." : "Open assigned tasks"}
          </button>
        </section>
      )}
    </main>
  );
}
