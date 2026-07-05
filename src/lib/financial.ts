import { PaymentStatus } from "@prisma/client";

export type FinancialInput = {
  taskId?: string;
  quoteContractor?: string | null;
  quoteNumber?: string | null;
  quoteDate?: Date | null;
  quoteAmountExGst?: number | null;
  quoteGst?: number | null;
  quoteTotalIncGst?: number | null;
  invoiceContractor?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
  invoiceAmountExGst?: number | null;
  invoiceGst?: number | null;
  invoiceTotalIncGst?: number | null;
  allowedVariancePercent?: number | null;
  allowedVarianceAmount?: number | null;
  variationApproved?: boolean | null;
};

export type FinancialAssessment = {
  paymentStatus: PaymentStatus;
  paymentBlockReason: string;
  varianceAmount: number;
  variancePercent: number;
  gstCheckStatus: string;
  duplicateInvoiceStatus: string;
  readyForPayment: boolean;
};

const money = (value: number) => `$${value.toFixed(2)}`;

function n(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function norm(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function gstExpected(exGst: number) {
  return Math.round(exGst * 0.1 * 100) / 100;
}

function gstMatches(exGst: number, gst: number) {
  if (!exGst && !gst) return true;
  return Math.abs(gstExpected(exGst) - gst) <= 0.02;
}

export function assessFinancial(input: FinancialInput, duplicateInvoiceFound: boolean): FinancialAssessment {
  const quoteTotal = n(input.quoteTotalIncGst);
  const invoiceTotal = n(input.invoiceTotalIncGst);
  const quoteEx = n(input.quoteAmountExGst);
  const quoteGst = n(input.quoteGst);
  const invoiceEx = n(input.invoiceAmountExGst);
  const invoiceGst = n(input.invoiceGst);
  const allowedPercent = n(input.allowedVariancePercent);
  const allowedAmount = n(input.allowedVarianceAmount);

  const varianceAmount = invoiceTotal - quoteTotal;
  const variancePercent = quoteTotal > 0 ? (varianceAmount / quoteTotal) * 100 : 0;
  const allowedVariance = Math.max(allowedAmount, quoteTotal * (allowedPercent / 100));

  const hasQuote = quoteTotal > 0 || !!input.quoteNumber || !!input.quoteDate || !!input.quoteContractor;
  const hasInvoice = invoiceTotal > 0 || !!input.invoiceNumber || !!input.invoiceDate || !!input.invoiceContractor;

  const contractorMismatch =
    !!input.quoteContractor &&
    !!input.invoiceContractor &&
    norm(input.quoteContractor) !== norm(input.invoiceContractor);

  const invoiceBeforeQuote =
    !!input.quoteDate &&
    !!input.invoiceDate &&
    input.invoiceDate.getTime() < input.quoteDate.getTime();

  const gstOk =
    gstMatches(quoteEx, quoteGst) &&
    gstMatches(invoiceEx, invoiceGst);

  let paymentStatus: PaymentStatus = "PENDING";
  const flags: string[] = [];

  if (!hasQuote && !hasInvoice) {
    paymentStatus = "PENDING";
    flags.push("No quote or invoice entered.");
  } else if (!hasQuote && hasInvoice) {
    paymentStatus = "BLOCKED";
    flags.push("Missing quote or approval trail.");
  } else if (hasQuote && !hasInvoice) {
    paymentStatus = "PENDING";
    flags.push("Quote recorded. Invoice not yet received.");
  } else if (contractorMismatch) {
    paymentStatus = "BLOCKED";
    flags.push("Contractor on invoice does not match contractor on quote.");
  } else if (duplicateInvoiceFound) {
    paymentStatus = "BLOCKED";
    flags.push("Possible duplicate invoice number already exists.");
  } else if (invoiceBeforeQuote) {
    paymentStatus = "WARNING";
    flags.push("Invoice date is earlier than quote date.");
  } else if (!gstOk) {
    paymentStatus = "WARNING";
    flags.push("GST does not match expected 10% check.");
  } else if (invoiceTotal <= quoteTotal) {
    paymentStatus = "PASS";
    flags.push("Invoice is within approved quote.");
  } else if (varianceAmount > 0 && input.variationApproved) {
    paymentStatus = "PASS";
    flags.push("Invoice exceeds quote, but approved variation is recorded.");
  } else if (varianceAmount > 0 && allowedVariance > 0 && varianceAmount <= allowedVariance) {
    paymentStatus = "WARNING";
    flags.push(`Invoice exceeds quote by ${money(varianceAmount)} but is within configured tolerance.`);
  } else if (varianceAmount > 0) {
    paymentStatus = "BLOCKED";
    flags.push(`Invoice exceeds quote by ${money(varianceAmount)} / ${variancePercent.toFixed(2)}% without approved variation.`);
  }

  return {
    paymentStatus,
    paymentBlockReason: flags.join(" "),
    varianceAmount,
    variancePercent,
    gstCheckStatus: gstOk ? "Pass" : "Warning",
    duplicateInvoiceStatus: duplicateInvoiceFound ? "Duplicate found" : "No duplicate",
    readyForPayment: paymentStatus === "PASS"
  };
}
