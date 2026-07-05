import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { phoneMatches } from "@/lib/contractorAccess";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  const companyId = String(body.companyId ?? "").trim();
  const companyPhone = String(body.companyPhone ?? "").trim();
  const pinCode = String(body.pinCode ?? "").trim();

  if (!companyId || !companyPhone || !pinCode) {
    return NextResponse.json({ error: "Company, phone and PIN are required." }, { status: 400 });
  }

  const company = await prisma.contractorCompany.findUnique({ where: { id: companyId } });

  if (!company || !company.active) {
    return NextResponse.json({ error: "Company access is not active." }, { status: 403 });
  }

  if (!phoneMatches(companyPhone, company.companyPhone)) {
    return NextResponse.json({ error: "Company phone number does not match." }, { status: 403 });
  }

  const grant = await prisma.contractorAccessGrant.findFirst({
    where: {
      companyId,
      pinCode,
      active: true,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      company: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!grant) {
    return NextResponse.json({ error: "PIN is invalid or expired." }, { status: 403 });
  }

  await prisma.contractorAccessGrant.update({
    where: { id: grant.id },
    data: { lastUsedAt: new Date() }
  });

  return NextResponse.json({
    accessToken: grant.accessToken,
    company: grant.company,
    accessScope: grant.accessScope,
    taskId: grant.taskId,
    taskCode: grant.taskCode,
    expiresAt: grant.expiresAt
  });
}
