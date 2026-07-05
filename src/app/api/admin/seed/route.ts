import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const existingScheme = await prisma.scheme.findFirst();

  if (existingScheme) {
    return NextResponse.json({
      ok: true,
      message: "Seed skipped. Scheme already exists.",
      scheme: existingScheme
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "committee@example.com" },
    update: {},
    create: {
      fullName: "Committee Admin",
      email: "committee@example.com",
      role: "ADMIN"
    }
  });

  const scheme = await prisma.scheme.create({
    data: {
      name: "Dakabin Crossing CTS 52709",
      ctsNumber: "52709",
      address: "140 Alma Road, Dakabin QLD"
    }
  });

  const task = await prisma.task.create({
    data: {
      taskCode: "CT-000001",
      schemeId: scheme.id,
      category: "Cleaning / Waste",
      frequency: "Weekly",
      areaAsset: "Bin storage areas",
      responsibleParty: "Caretaker",
      requirementRef: "Caretaker Agreement / Common Property Maintenance",
      requirement:
        "Inspect bin areas for cleanliness, overflow, contamination, odour, dumped items or pest risk. Record action taken and escalate if required.",
      status: "SCHEDULED",
      priority: "NORMAL",
      createdById: admin.id,
      checklistItems: {
        create: [
          { text: "Bin area inspected", sortOrder: 1 },
          { text: "Overflow/contamination checked", sortOrder: 2 },
          { text: "Dumped items recorded if present", sortOrder: 3 },
          { text: "Photo evidence uploaded", sortOrder: 4 },
          { text: "Follow-up logged if required", sortOrder: 5 }
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
          actorId: admin.id,
          eventType: "SEED",
          detail: "Initial sample task created from admin seed endpoint."
        }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Seed complete.",
    scheme,
    task
  });
}
