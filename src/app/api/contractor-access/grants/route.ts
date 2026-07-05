import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { daysFromNow, makeAccessToken, makePin } from "@/lib/contractorAccess";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();

  const companyId = String(body.companyId ?? "").trim();
  const taskId = body.taskId ? String(body.taskId) : null;
  const taskCode = body.taskCode ? String(body.taskCode) : null;
  const accessScope = body.accessScope === "COMPANY_TASKS" ? "COMPANY_TASKS" : "TASK_ONLY";
  const days = Number(body.daysValid ?? 14);

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required." }, { status: 400 });
  }

  const company = await prisma.contractorCompany.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Contractor company not found." }, { status: 404 });
  }

  if (accessScope === "TASK_ONLY" && !taskId && !taskCode) {
    return NextResponse.json({ error: "TASK_ONLY access requires taskId or taskCode." }, { status: 400 });
  }

  const grant = await prisma.contractorAccessGrant.create({
    data: {
      companyId,
      taskId,
      taskCode,
      accessScope,
      pinCode: makePin(),
      accessToken: makeAccessToken(),
      expiresAt: daysFromNow(Number.isFinite(days) && days > 0 ? days : 14)
    },
    include: {
      company: true
    }
  });

  return NextResponse.json({
    grant,
    instructions: {
      company: grant.company.companyName,
      companyPhone: grant.company.companyPhone,
      pinCode: grant.pinCode,
      accessScope: grant.accessScope,
      expiresAt: grant.expiresAt
    }
  });
}
