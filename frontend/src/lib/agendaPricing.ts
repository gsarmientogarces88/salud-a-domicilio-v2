export function isValidAgendaBaseFee(fee?: number | null): boolean {
  return typeof fee === 'number' && Number.isFinite(fee) && fee > 0;
}

export function formatAgendaHomeVisitFeeClp(fee?: number | null): string {
  if (!isValidAgendaBaseFee(fee)) return '';
  return `$${fee.toLocaleString('es-CL')}`;
}
