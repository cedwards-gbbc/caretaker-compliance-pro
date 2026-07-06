import { NextResponse } from "next/server";
import { maintenanceChecklist } from "@/lib/maintenanceChecklist";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ maintenanceChecklist });
}
