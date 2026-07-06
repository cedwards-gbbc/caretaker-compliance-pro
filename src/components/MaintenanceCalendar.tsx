"use client";

import { useMemo, useState } from "react";
import { frequencyLabel, maintenanceChecklist, MaintenanceItem } from "@/lib/maintenanceChecklist";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function key(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function shortService(service: string) {
  return service
    .replace(" and records", "")
    .replace(" and clean", "")
    .replace(" maintenance", "")
    .replace(" services", "")
    .replace(" inspection", "")
    .replace(" system service", "")
    .replace("Building defects, repairs and maintenance", "Defects / repairs");
}

function datesFor(item: MaintenanceItem, start: Date) {
  const end = addMonths(start, 13);
  const out: Date[] = [];

  if (item.frequency === "AS_REQUIRED") return out;

  if (item.frequency === "DAILY") {
    for (let d = new Date(start); d <= addDays(start, 14); d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }

  if (item.frequency === "WEEKLY" || item.frequency === "COLLECTION_DAYS") {
    for (let d = new Date(start); d <= end; d = addDays(d, 7)) out.push(new Date(d));
    return out;
  }

  const step = { MONTHLY:1, QUARTERLY:3, FOUR_MONTHLY:4, SIX_MONTHLY:6, ANNUAL:12 }[item.frequency] || 1;
  for (let d = new Date(start); d <= end; d = addMonths(d, step)) out.push(new Date(d));
  return out;
}

export default function MaintenanceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(key(now));

  const scheduled = useMemo(() => {
    const start = new Date(year, month, 1);
    return maintenanceChecklist.flatMap(item => datesFor(item, start).map(date => ({ date: key(date), item })));
  }, [year, month]);

  const days = useMemo(() => buildMonth(year, month), [year, month]);
  const selected = scheduled.filter(x => x.date === selectedDate);
  const monthAgenda = scheduled
    .filter(x => {
      const d = new Date(x.date + "T00:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  function move(n: number) {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <main className="maintenance-shell">
      <header className="maintenance-header">
        <span>Dakabin Crossing</span>
        <h1>Maintenance Calendar</h1>
        <p>Recurring maintenance works are plotted below by frequency.</p>
        <div className="maintenance-header-actions">
          <a href="/">Main calendar</a>
          <a href="/task-register">Task register</a>
        </div>
      </header>

      <section className="maintenance-controls">
        <button className="secondary" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDate(key(now)); }}>Today</button>
        <button className="secondary" onClick={() => move(-1)}>Prev</button>
        <button className="secondary" onClick={() => move(1)}>Next</button>
        <div>
          <h2>{MONTHS[month]} {year}</h2>
          <p>Selected date: {new Date(selectedDate + "T00:00:00").toLocaleDateString()}</p>
        </div>
      </section>

      <section className="maintenance-calendar-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => <strong key={day}>{day}</strong>)}
        {days.map(day => {
          const dateKey = key(day);
          const items = scheduled.filter(x => x.date === dateKey);
          return (
            <button key={dateKey} className={`maintenance-day ${day.getMonth() === month ? "" : "muted-day"} ${dateKey === selectedDate ? "selected" : ""}`} onClick={() => setSelectedDate(dateKey)}>
              <span>{day.getDate()}</span>
              {items.slice(0, 3).map(x => <em key={`${x.item.code}-${dateKey}`}>{shortService(x.item.service)}</em>)}
              {items.length > 3 ? <small>+{items.length - 3} more</small> : null}
            </button>
          );
        })}
      </section>

      <section className="maintenance-selected">
        <h2>Selected date work</h2>
        {selected.length === 0 ? <p>No scheduled maintenance plotted for this date.</p> : selected.map(({ item }) => (
          <article key={item.code} className="maintenance-work-card">
            <span>{item.code}</span>
            <strong>{item.service}</strong>
            <p>{item.category} | {frequencyLabel(item.frequency)} | {item.responsibleParty.replace("_", " ")}</p>
            <ul>{item.checklist.map(line => <li key={line}>{line}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="maintenance-selected maintenance-agenda">
        <h2>{MONTHS[month]} maintenance agenda</h2>
        {monthAgenda.map(({ date, item }) => (
          <article key={`${date}-${item.code}`} className="maintenance-agenda-row" onClick={() => setSelectedDate(date)}>
            <div>
              <span>{new Date(date + "T00:00:00").toLocaleDateString()}</span>
              <strong>{item.service}</strong>
              <p>{frequencyLabel(item.frequency)} | {item.responsibleParty.replace("_", " ")}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
