import { prisma } from "@/lib/prisma";

type Purpose = "INSPECTION" | "QUOTE" | "APPROVAL" | "REPAIR" | "FOLLOW_UP" | "MONITORING" | "OTHER";

export function nextDefectStatusFromTask(purpose: Purpose, currentStatus: string, isClosureTask: boolean) {
  if (purpose === "INSPECTION") return "QUOTE_REQUIRED";
  if (purpose === "QUOTE") return "AWAITING_APPROVAL";
  if (purpose === "APPROVAL") return "APPROVED_FOR_REPAIR";
  if (purpose === "REPAIR") return isClosureTask ? "VERIFICATION_REQUIRED" : "REPAIR_COMPLETED";
  if (purpose === "FOLLOW_UP") return "CLOSED";
  return currentStatus;
}

export async function applyLinkedTaskCompletion(taskId: string) {
  const links = await prisma.defectTaskLink.findMany({
    where: { taskId },
    include: { defect: true, task: { include: { documents: true, financialControl: true } } }
  });

  for (const link of links) {
    const nextStatus = nextDefectStatusFromTask(
      link.purpose as Purpose,
      link.defect.status,
      link.isClosureTask
    );

    const canClose =
      nextStatus === "CLOSED" ||
      (link.isClosureTask &&
        link.defect.closureEvidenceRequired === false &&
        link.task.status === "COMPLETED");

    await prisma.defect.update({
      where: { id: link.defectId },
      data: {
        status: (canClose ? "CLOSED" : nextStatus) as any,
        closedAt: canClose ? new Date() : undefined,
        closureTaskId: link.isClosureTask ? taskId : link.defect.closureTaskId,
        auditEvents: {
          create: {
            eventType: "LINKED_TASK_COMPLETED",
            detail: `Linked task ${link.task.taskCode} completed as ${link.purpose}. Defect moved to ${canClose ? "CLOSED" : nextStatus}.`
          }
        }
      }
    });
  }
}
