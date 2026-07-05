import { prisma } from "@/lib/prisma";

function fmt(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const task = await prisma.task.findUnique({ where: { id }, include: { scheme: true } });

  if (!task) {
    return new Response("Task not found", { status: 404 });
  }

  const start = task.dueDate ?? new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Caretaker Compliance Pro//EN",
    "BEGIN:VEVENT",
    `UID:${task.id}@caretaker-compliance-pro`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Caretaker Task: ${task.areaAsset}`,
    `DESCRIPTION:${task.requirement.replace(/\n/g, "\\n")}`,
    `LOCATION:${task.scheme.address ?? task.scheme.name}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${task.taskCode}.ics"`
    }
  });
}
