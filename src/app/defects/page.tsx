export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import DefectWorkspace from "@/components/DefectWorkspace";

export default async function DefectsPage() {
  const [defects, schemes] = await Promise.all([
    prisma.defect.findMany({
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
    }),
    prisma.scheme.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <DefectWorkspace
      initialDefects={JSON.parse(JSON.stringify(defects))}
      schemes={JSON.parse(JSON.stringify(schemes))}
    />
  );
}
