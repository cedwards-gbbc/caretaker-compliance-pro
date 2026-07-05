import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextTaskCode } from "@/lib/taskCode";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();

  const defect = await prisma.defect.findUnique({ where: { id } });
  if (!defect) return NextResponse.json({ error: "Defect not found." }, { status: 404 });

  const purpose = String(body.purpose ?? "OTHER");
  const taskCode = await nextTaskCode();

  const defaultRequirement =
    purpose === "INSPECTION" ? "Inspect defect and upload evidence/report." :
    purpose === "QUOTE" ? "Obtain quote for defect rectification." :
    purpose === "APPROVAL" ? "Obtain committee approval for defect rectification." :
    purpose === "REPAIR" ? "Complete approved repair works and upload completion evidence." :
    purpose === "FOLLOW_UP" ? "Verify repair completion and confirm defect can be closed." :
    "Action linked to defect.";

  const task = await prisma.task.create({
    data: {
      taskCode,
      schemeId: defect.schemeId,
      category: "Defect Management",
      frequency: "Ad hoc",
      areaAsset: `${defect.defectCode} - ${defect.title}`,
      responsibleParty: String(body.responsibleParty ?? defect.responsibleParty ?? "Property Manager"),
      contractorCompany: String(body.contractorCompany ?? ""),
      requirement: String(body.requirement ?? defaultRequirement),
      dueDate: body.dueDate ? new Date(`${body.dueDate}T08:00:00.000Z`) : null,
      startTime: body.startTime ?? "08:00",
      endTime: body.endTime ?? "08:30",
      priority: defect.riskRating === "CRITICAL" ? "URGENT" : defect.riskRating === "HIGH" ? "HIGH" : "NORMAL",
      checklistItems: {
        create: [
          { text: "Scope confirmed", sortOrder: 1 },
          { text: "Evidence uploaded", sortOrder: 2 },
          { text: "Financial control checked", sortOrder: 3 },
          { text: "Defect register updated", sortOrder: 4 }
        ]
      },
      financialControl: {
        create: {
          paymentStatus: "PENDING",
          paymentBlockReason: "No quote or invoice entered."
        }
      },
      defectLinks: {
        create: {
          defectId: id,
          purpose: purpose as any,
          isClosureTask: body.isClosureTask === true || body.isClosureTask === "true",
          notes: String(body.notes ?? "")
        }
      },
      auditEvents: {
        create: {
          eventType: "CREATE_FROM_DEFECT",
          detail: `Task created from defect ${defect.defectCode}. Purpose: ${purpose}.`
        }
      }
    },
    include: { financialControl: true, defectLinks: true }
  });

  await prisma.defect.update({
    where: { id },
    data: {
      status:
        purpose === "INSPECTION" ? "INSPECTION_REQUIRED" :
        purpose === "QUOTE" ? "QUOTE_REQUIRED" :
        purpose === "APPROVAL" ? "AWAITING_APPROVAL" :
        purpose === "REPAIR" ? "REPAIR_SCHEDULED" :
        defect.status,
      auditEvents: {
        create: {
          eventType: "LINKED_TASK_CREATED",
          detail: `Linked task ${task.taskCode} created. Purpose: ${purpose}.`
        }
      }
    }
  });

  return NextResponse.json({ task });
}
