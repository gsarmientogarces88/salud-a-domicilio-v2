export const AGENDA_HOME_VISIT_FEE_ERROR =
  'Debe configurar el valor de la consulta a domicilio';

export function isValidAgendaBaseFee(fee: unknown): fee is number {
  return typeof fee === 'number' && Number.isFinite(fee) && fee > 0;
}

export function assertAgendaBaseFeeConfigured(fee: unknown): number {
  if (!isValidAgendaBaseFee(fee)) {
    throw new Error(AGENDA_HOME_VISIT_FEE_ERROR);
  }
  return fee;
}
