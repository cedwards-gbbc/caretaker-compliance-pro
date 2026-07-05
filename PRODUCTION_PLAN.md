# Production Implementation Plan

## Phase 1 — Core live system

- PostgreSQL database
- Auth/login
- Scheme setup
- Users and roles
- Caretaker task register
- Evidence file storage
- Quote/invoice controls
- Audit trail

## Phase 2 — Body corporate reporting

- Monthly caretaker evidence report
- Committee action report
- Owner-visible task summaries
- Payment exception report
- Missing evidence report
- Overdue task report

## Phase 3 — Calendar and recurrence

- Google Calendar OAuth
- Create calendar event from task
- Store `calendarEventId`
- Update event on task changes
- Recurring task generation
- Reminder emails

## Phase 4 — Controls and governance

- Lock completed records
- Require reason for changes after verification
- Variation approval workflow
- Committee approval record
- Restricted document visibility
- Owner-facing document filtering

## Phase 5 — Mobile field use

- Mobile-first task completion screen
- Camera capture
- GPS capture
- Offline queue
- Contractor portal
