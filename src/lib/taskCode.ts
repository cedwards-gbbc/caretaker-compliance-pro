import { prisma } from "@/lib/prisma";

export async function nextTaskCode() {
  const count = await prisma.task.count();
  return `CT-${String(count + 1).padStart(6, "0")}`;
}
