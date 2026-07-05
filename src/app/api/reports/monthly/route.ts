import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { dueDate: { gte: start, lt: end } },
        { actionedAt: { gte: start, lt: end } },
        { updatedAt: { gte: start, lt: end } }
      ]
    },
    include: { scheme: true, financialControl: true, documents: true }
  });

  const summary = {
    period: `${year}-${String(month).padStart(2, "0")}`,
    totalTasks: tasks.length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
    actioned: tasks.filter(t => t.status === "ACTIONED").length,
    needsFollowUp: tasks.filter(t => t.status === "NEEDS_FOLLOW_UP" || t.followUpRequired).length,
    escalated: tasks.filter(t => t.status === "ESCALATED_TO_COMMITTEE").length,
    paymentBlocked: tasks.filter(t => t.financialControl?.paymentStatus === "BLOCKED").length,
    financialWarnings: tasks.filter(t => t.financialControl?.paymentStatus === "WARNING").length
  };

  return NextResponse.json({ summary, tasks });
}
