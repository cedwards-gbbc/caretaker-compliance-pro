import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const defect = await prisma.defect.findUnique({
    where: { id },
    include: { taskLinks: { include: { task: { include: { documents: true, financialControl: true } } } } }
  });

  if (!defect) return NextResponse.json({ error: "Defect not found." }, { status: 404 });

  const closureTask = defect.taskLinks.find((link) => link.isClosureTask);
  const repairCompleted = defect.taskLinks.some(
    (link) => link.purpose === "REPAIR" && ["ACTIONED", "COMPLETED"].includes(link.task.status)
  );
  const evidenceOk =
    !defect.closureEvidenceRequired ||
    defect.taskLinks.some((link) => (link.task.documents?.length ?? 0) > 0) ||
    !!defect.evidenceFolderUrl ||
    !!defect.photoFolderUrl;

  if (!body.force && (!repairCompleted || !evidenceOk)) {
    return NextResponse.json({
      error: "Defect cannot be closed yet.",
      checks: {
        repairCompleted,
        evidenceOk,
        closureTaskSet: !!closureTask
      }
    }, { status: 400 });
  }

  const updated = await prisma.defect.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: String(body.closedBy ?? "System/User"),
      closureNotes: String(body.closureNotes ?? "Closed from defect register."),
      auditEvents: {
        create: {
          eventType: "CLOSE",
          detail: String(body.closureNotes ?? "Defect closed.")
        }
      }
    }
  });

  return NextResponse.json({ defect: updated });
}
