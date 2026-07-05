import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();

  if (!reason) {
    return NextResponse.json({ error: "Void reason is required." }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: String(body.deletedBy ?? "System/User"),
      deletedReason: reason,
      status: "NOT_REQUIRED",
      auditEvents: {
        create: {
          eventType: "VOID_TASK",
          detail: `Task voided. Reason: ${reason}`
        }
      }
    },
    include: {
      scheme: true,
      checklistItems: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      financialControl: true,
      auditEvents: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  return NextResponse.json({ task: updated });
}
