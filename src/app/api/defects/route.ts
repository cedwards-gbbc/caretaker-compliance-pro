import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextDefectCode } from "@/lib/defectCode";

export const dynamic = "force-dynamic";

function parseDate(value: unknown) {
  const text = String(value ?? "");
  return text ? new Date(text) : new Date();
}

function parseBool(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function parseNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";

  const defects = await prisma.defect.findMany({
    where: status ? { status: status as any } : {},
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      scheme: true,
      taskLinks: {
        include: {
          task: {
            include: {
              financialControl: true,
              documents: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 30 }
    }
  });

  return NextResponse.json({ defects });
}

export async function POST(req: Request) {
  const body = await req.json();
  const schemeId = String(body.schemeId ?? "");

  const scheme = await prisma.scheme.findUnique({ where: { id: schemeId } });
  if (!scheme) return NextResponse.json({ error: "Scheme not found." }, { status: 400 });

  const defectCode = await nextDefectCode();

  const defect = await prisma.defect.create({
    data: {
      defectCode,
      schemeId,
      title: String(body.title ?? "New defect"),
      description: String(body.description ?? "Describe the defect."),
      location: String(body.location ?? ""),
      lotReference: String(body.lotReference ?? ""),
      assetCategory: String(body.assetCategory ?? ""),
      commonPropertyImpact: parseBool(body.commonPropertyImpact ?? true),
      riskRating: String(body.riskRating ?? "MEDIUM") as any,
      urgency: String(body.urgency ?? "NORMAL") as any,
      status: String(body.status ?? "REPORTED") as any,
      reportedBy: String(body.reportedBy ?? ""),
      reportedDate: parseDate(body.reportedDate),
      responsibleParty: String(body.responsibleParty ?? "Property Manager"),
      insuranceRelevant: parseBool(body.insuranceRelevant),
      legalSensitive: parseBool(body.legalSensitive),
      committeeApprovalRequired: parseBool(body.committeeApprovalRequired),
      ownerCommunicationRequired: parseBool(body.ownerCommunicationRequired),
      estimatedCost: parseNumber(body.estimatedCost),
      actualCost: parseNumber(body.actualCost),
      fundingSource: String(body.fundingSource ?? ""),
      evidenceFolderUrl: String(body.evidenceFolderUrl ?? ""),
      photoFolderUrl: String(body.photoFolderUrl ?? ""),
      documentFolderUrl: String(body.documentFolderUrl ?? ""),
      auditEvents: {
        create: {
          eventType: "CREATE",
          detail: "Defect logged."
        }
      }
    },
    include: { scheme: true, taskLinks: true, auditEvents: true }
  });

  return NextResponse.json({ defect });
}
