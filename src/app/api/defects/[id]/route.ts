import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown) {
  const text = String(value ?? "");
  return text ? new Date(text) : null;
}

function parseBool(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function parseNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.defect.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Defect not found." }, { status: 404 });

  const defect = await prisma.defect.update({
    where: { id },
    data: {
      schemeId: String(body.schemeId),
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      location: String(body.location ?? ""),
      lotReference: String(body.lotReference ?? ""),
      assetCategory: String(body.assetCategory ?? ""),
      commonPropertyImpact: parseBool(body.commonPropertyImpact),
      riskRating: String(body.riskRating ?? "MEDIUM") as any,
      urgency: String(body.urgency ?? "NORMAL") as any,
      status: String(body.status ?? "REPORTED") as any,
      reportedBy: String(body.reportedBy ?? ""),
      reportedDate: parseDate(body.reportedDate) ?? existing.reportedDate,
      responsibleParty: String(body.responsibleParty ?? ""),
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
      closureEvidenceRequired: parseBool(body.closureEvidenceRequired),
      closureNotes: String(body.closureNotes ?? ""),
      auditEvents: {
        create: {
          eventType: "UPDATE",
          detail: "Defect record updated."
        }
      }
    },
    include: {
      scheme: true,
      taskLinks: { include: { task: { include: { financialControl: true, documents: true } } } },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 30 }
    }
  });

  return NextResponse.json({ defect });
}
