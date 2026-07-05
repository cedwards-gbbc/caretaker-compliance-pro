import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const accessToken = String(url.searchParams.get("token") ?? "");

  if (!accessToken) {
    return NextResponse.json({ error: "Access token is required." }, { status: 401 });
  }

  const grant = await prisma.contractorAccessGrant.findUnique({
    where: { accessToken },
    include: {
      company: true
    }
  });

  if (!grant || !grant.active || grant.expiresAt <= new Date() || !grant.company.active) {
    return NextResponse.json({ error: "Access is invalid or expired." }, { status: 403 });
  }

  const companyName = grant.company.companyName;

  const where: any =
    grant.accessScope === "COMPANY_TASKS"
      ? {
          OR: [
            { assignedCompanyId: grant.companyId },
            { contractorCompany: companyName }
          ]
        }
      : {
          OR: [
            grant.taskId ? { id: grant.taskId } : undefined,
            grant.taskCode ? { code: grant.taskCode } : undefined,
            grant.taskCode ? { taskCode: grant.taskCode } : undefined
          ].filter(Boolean)
        };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" }
    ],
    take: 100
  });

  return NextResponse.json({
    company: grant.company,
    accessScope: grant.accessScope,
    expiresAt: grant.expiresAt,
    tasks
  });
}
