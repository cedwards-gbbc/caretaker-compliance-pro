# Caretaker Compliance Pro

Proper full-stack version for body corporate caretaker task evidence, document control, quote vs invoice financial checks, and calendar-ready scheduling.

## What this version includes

- Next.js full-stack app
- Prisma database layer
- SQLite local dev database
- PostgreSQL-ready production schema
- Task register
- Body corporate scheme table
- Caretaker task records
- Checklist records
- Evidence/document uploads
- Quote vs invoice financial controls
- GST check
- Duplicate invoice check
- Variation approval logic
- Payment status: PASS / WARNING / BLOCKED / PENDING
- Audit trail
- Monthly JSON report endpoint
- ICS calendar export endpoint
- Production-ready structure for Google Calendar API integration

## Install

```bash
npm install
cp .env.example .env
npm run db:push
npm run seed
npm run dev
```

Open:

```text
http://localhost:3000
```

## Local storage

Uploaded files are stored in:

```text
public/uploads
```

For production, move file storage to:

- Supabase Storage
- AWS S3
- Google Drive

## Database

Local dev uses SQLite:

```text
DATABASE_URL="file:./dev.db"
```

Production should use PostgreSQL.

Change `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then use a PostgreSQL DATABASE_URL.

## Key controls

### Payment blocked when

- invoice exists but no quote exists
- invoice exceeds quote without variation approval
- contractor mismatch between quote and invoice
- duplicate invoice number exists
- other financial control rules fail

### Warning when

- invoice date is before quote date
- GST does not match expected 10%
- invoice exceeds quote but is inside configured tolerance

### Pass when

- invoice is within quote
- invoice exceeds quote but approved variation is recorded

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/tasks` | List tasks |
| `POST /api/tasks` | Create task |
| `PATCH /api/tasks/:id` | Save task and recalculate financial controls |
| `POST /api/tasks/:id/stamp-actioned` | Stamp task as actioned |
| `POST /api/tasks/:id/files` | Upload files |
| `GET /api/reports/monthly?year=2026&month=7` | Monthly summary JSON |
| `GET /api/calendar/ics/:id` | Download calendar event file |

## Production next steps

To deploy properly:

1. Use PostgreSQL
2. Add authentication
3. Add role permissions
4. Add cloud file storage
5. Add Google Calendar OAuth
6. Add email notifications
7. Add PDF report generation
8. Add recurring task generation
9. Add immutable audit log hardening
10. Add owner-facing read-only reports

## Recommended production deployment

| Layer | Recommended |
|---|---|
| Frontend/backend | Next.js |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth or Clerk |
| File storage | Supabase Storage or Google Drive |
| Hosting | Vercel |
| Background jobs | Vercel Cron or Trigger.dev |
| Calendar | Google Calendar API |
| Reports | HTML to PDF service |


## Mobile app / PWA mode

This version includes Progressive Web App support.

Included:

- `public/manifest.json`
- `public/sw.js`
- app icons
- iPhone `apple-touch-icon`
- mobile install helper banner
- standalone display mode

### iPhone install

1. Open the deployed site in Safari.
2. Tap the Share button.
3. Tap `Add to Home Screen`.
4. The app icon will appear in the App Library / Home Screen.

### Android install

1. Open the deployed site in Chrome.
2. Tap the menu.
3. Tap `Install app` or `Add to Home screen`.

### Important

PWA install requires the app to be served over HTTPS in production.
Localhost works for testing.
