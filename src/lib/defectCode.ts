import { prisma } from "@/lib/prisma";

export async function nextDefectCode() {
  const count = await prisma.defect.count();
  return `DF-${String(count + 1).padStart(6, "0")}`;
}
