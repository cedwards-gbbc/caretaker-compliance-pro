import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedReason: null,
      status: "SCHEDULED",
      auditEvents: {
        create: {
          eventType: "RESTORE_TASK",
          detail: "Voided task restored to active schedule."
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
