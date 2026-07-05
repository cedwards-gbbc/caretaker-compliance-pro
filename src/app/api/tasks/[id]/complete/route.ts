import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyLinkedTaskCompletion } from "@/lib/defectLifecycle";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: "COMPLETED",
      actionedAt: new Date(),
      verifiedDate: new Date(),
      auditEvents: {
        create: {
          eventType: "COMPLETE",
          detail: "Task marked completed."
        }
      }
    }
  });

  await applyLinkedTaskCompletion(id);

  return NextResponse.json({ task });
}
