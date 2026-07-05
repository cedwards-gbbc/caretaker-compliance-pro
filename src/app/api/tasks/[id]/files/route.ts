import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const category = String(form.get("category") ?? "OTHER");
  const visibility = String(form.get("visibility") ?? "COMMITTEE_ONLY");
  const notes = String(form.get("notes") ?? "");

  if (!files.length || !files[0]?.size) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", id);
  await mkdir(uploadDir, { recursive: true });

  const created = [];

  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const safeOriginal = file.name.replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
    const systemName = `${Date.now()}-${safeOriginal}`;
    const diskPath = path.join(uploadDir, systemName);
    await writeFile(diskPath, bytes);

    const storagePath = `/uploads/${id}/${systemName}`;

    const doc = await prisma.evidenceFile.create({
      data: {
        taskId: id,
        category: category as any,
        visibility: visibility as any,
        originalName: file.name,
        systemName,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
        notes
      }
    });

    created.push(doc);
  }

  await prisma.auditEvent.create({
    data: {
      taskId: id,
      eventType: "FILE_UPLOAD",
      detail: `${created.length} file(s) uploaded.`
    }
  });

  return NextResponse.json({ documents: created });
}
