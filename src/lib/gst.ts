export const AU_GST_RATE = 0.10;

export function gstFromInc(amountIncGst: number) {
  if (!Number.isFinite(amountIncGst) || amountIncGst <= 0) return 0;
  return Math.round((amountIncGst / 11) * 100) / 100;
}

export function exGstFromInc(amountIncGst: number) {
  if (!Number.isFinite(amountIncGst) || amountIncGst <= 0) return 0;
  return Math.round((amountIncGst - gstFromInc(amountIncGst)) * 100) / 100;
}

export function incGstFromEx(amountExGst: number) {
  if (!Number.isFinite(amountExGst) || amountExGst <= 0) return 0;
  return Math.round((amountExGst * 1.10) * 100) / 100;
}
