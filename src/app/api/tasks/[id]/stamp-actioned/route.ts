import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: "ACTIONED",
      actionedAt: new Date(),
      auditEvents: {
        create: {
          eventType: "ACTION_STAMP",
          detail: "Task actioned timestamp recorded."
        }
      }
    }
  });

  return NextResponse.json({ task });
}
