import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextTaskCode } from "@/lib/taskCode";

export const dynamic = "force-dynamic";

function parseDueDate(value: unknown) {
  const text = String(value ?? "");
  return text ? new Date(`${text}T08:00:00.000Z`) : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "active";

  const where =
    view === "voided"
      ? { isDeleted: true }
      : view === "all"
        ? {}
        : { isDeleted: false };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      scheme: true,
      checklistItems: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      financialControl: true,
      auditEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      defectLinks: { include: { defect: true } }
    }
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const schemeId = body.schemeId as string;

  const scheme = await prisma.scheme.findUnique({ where: { id: schemeId } });
  if (!scheme) return NextResponse.json({ error: "Scheme not found." }, { status: 400 });

  const taskCode = await nextTaskCode();

  const task = await prisma.task.create({
    data: {
      taskCode,
      schemeId,
      category: body.category ?? "Administration / Reporting",
      frequency: body.frequency ?? "Ad hoc",
      areaAsset: body.areaAsset ?? "New caretaker task",
      responsibleParty: body.responsibleParty ?? "Caretaker",
      contractorCompany: body.contractorCompany ?? "",
      requirement: body.requirement ?? "Define the caretaker requirement.",
      dueDate: parseDueDate(body.dueDate),
      startTime: body.startTime ?? "08:00",
      endTime: body.endTime ?? "08:30",
      isDeleted: false,
      checklistItems: {
        create: [
          { text: "Requirement reviewed", sortOrder: 1 },
          { text: "Task actioned", sortOrder: 2 },
          { text: "Evidence uploaded", sortOrder: 3 },
          { text: "Financial control checked if applicable", sortOrder: 4 },
          { text: "Follow-up assessed", sortOrder: 5 }
        ]
      },
      financialControl: {
        create: {
          paymentStatus: "PENDING",
          paymentBlockReason: "No quote or invoice entered."
        }
      },
      auditEvents: {
        create: {
          eventType: "CREATE",
          detail: "Task created."
        }
      }
    },
    include: { financialControl: true }
  });

  return NextResponse.json({ task });
}
