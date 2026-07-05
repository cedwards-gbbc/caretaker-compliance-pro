import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assessFinancial } from "@/lib/financial";

function parseDate(value: unknown) {
  const text = String(value ?? "");
  return text ? new Date(text) : null;
}

function parseNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { financialControl: true }
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const invoiceNumber = String(body.invoiceNumber ?? "").trim();

  const duplicateInvoice = invoiceNumber
    ? await prisma.financialControl.findFirst({
        where: {
          invoiceNumber,
          taskId: { not: id }
        }
      })
    : null;

  const financialInput = {
    quoteContractor: body.quoteContractor,
    quoteNumber: body.quoteNumber,
    quoteDate: parseDate(body.quoteDate),
    quoteAmountExGst: parseNumber(body.quoteAmountExGst),
    quoteGst: parseNumber(body.quoteGst),
    quoteTotalIncGst: parseNumber(body.quoteTotalIncGst),
    invoiceContractor: body.invoiceContractor,
    invoiceNumber,
    invoiceDate: parseDate(body.invoiceDate),
    invoiceAmountExGst: parseNumber(body.invoiceAmountExGst),
    invoiceGst: parseNumber(body.invoiceGst),
    invoiceTotalIncGst: parseNumber(body.invoiceTotalIncGst),
    allowedVariancePercent: parseNumber(body.allowedVariancePercent) ?? 0,
    allowedVarianceAmount: parseNumber(body.allowedVarianceAmount) ?? 0,
    variationApproved: body.variationApproved === "true"
  };

  const assessment = assessFinancial(financialInput, !!duplicateInvoice);

  const task = await prisma.task.update({
    where: { id },
    data: {
      schemeId: String(body.schemeId),
      requirementRef: String(body.requirementRef ?? ""),
      category: String(body.category ?? ""),
      frequency: String(body.frequency ?? ""),
      areaAsset: String(body.areaAsset ?? ""),
      responsibleParty: String(body.responsibleParty ?? ""),
      requirement: String(body.requirement ?? ""),
      status: String(body.status) as any,
      priority: String(body.priority) as any,
      dueDate: parseDate(body.dueDate),
      actionTaken: String(body.actionTaken ?? ""),
      exceptionNotes: String(body.exceptionNotes ?? ""),
      followUpNotes: String(body.followUpNotes ?? ""),
      financialControl: {
        upsert: {
          create: {
            ...financialInput,
            variationNotes: String(body.variationNotes ?? ""),
            ...assessment
          },
          update: {
            ...financialInput,
            variationNotes: String(body.variationNotes ?? ""),
            ...assessment
          }
        }
      },
      auditEvents: {
        create: {
          eventType: "UPDATE",
          detail: `Task saved. Payment status: ${assessment.paymentStatus}.`
        }
      }
    },
    include: { financialControl: true }
  });

  return NextResponse.json({ task });
}
