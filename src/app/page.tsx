export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import TaskWorkspace from "@/components/TaskWorkspace";

export default async function HomePage() {
  const [tasks, schemes] = await Promise.all([
    prisma.task.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: "desc" },
      include: {
        scheme: true,
        checklistItems: { orderBy: { sortOrder: "asc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
        financialControl: true,
        auditEvents: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    }),
    prisma.scheme.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <TaskWorkspace
      initialTasks={JSON.parse(JSON.stringify(tasks))}
      schemes={JSON.parse(JSON.stringify(schemes))}
    />
  );
}
