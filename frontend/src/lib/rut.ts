/** Validación y formato de RUT chileno. */

export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Formatea a 12.345.678-9 mientras se escribe. */
export function formatRut(value: string): string {
  const cleaned = cleanRut(value);
  if (!cleaned) return '';

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  if (!body) return dv;

  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

export function isValidRut(value: string): boolean {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += parseInt(body[i]!, 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === expectedDv;
}
