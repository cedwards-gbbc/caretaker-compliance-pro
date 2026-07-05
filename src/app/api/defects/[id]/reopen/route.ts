import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const updated = await prisma.defect.update({
    where: { id },
    data: {
      status: "UNDER_REVIEW",
      closedAt: null,
      reopenedAt: new Date(),
      reopenReason: String(body.reason ?? "Reopened from defect register."),
      auditEvents: {
        create: {
          eventType: "REOPEN",
          detail: String(body.reason ?? "Defect reopened.")
        }
      }
    }
  });

  return NextResponse.json({ defect: updated });
}
