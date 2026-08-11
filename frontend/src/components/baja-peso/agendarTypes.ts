/** Tipos y helpers del flujo de agendamiento Baja de peso. */

export type SlotStatus = 'available' | 'occupied';

export type TimeSlot = {
  time: string; // HH:mm
  status: SlotStatus;
};

export type PatientFormData = {
  nombreCompleto: string;
  rut: string;
  fechaNacimiento: string;
  sexo: '' | 'Femenino' | 'Masculino' | 'Otro';
  telefono: string;
  email: string;
  pesoKg: string;
  alturaCm: string;
  objetivoKg: string;
  motivo: string;
  enfermedades: string[];
  enfermedadOtra: string;
  medicamentos: string;
  alergias: string;
};

export const EMPTY_PATIENT_FORM: PatientFormData = {
  nombreCompleto: '',
  rut: '',
  fechaNacimiento: '',
  sexo: '',
  telefono: '',
  email: '',
  pesoKg: '',
  alturaCm: '',
  objetivoKg: '',
  motivo: '',
  enfermedades: [],
  enfermedadOtra: '',
  medicamentos: '',
  alergias: '',
};

export const ENFERMEDADES_OPCIONES = [
  'Diabetes',
  'Hipertensión',
  'Hipotiroidismo',
  'Ninguna',
  'Otra',
] as const;

/** Feriados Chile (fechas fijas + aproximadas 2026). Ampliar según API futura. */
const HOLIDAYS = new Set([
  '2026-01-01',
  '2026-04-03',
  '2026-04-04',
  '2026-05-01',
  '2026-05-21',
  '2026-06-21',
  '2026-06-29',
  '2026-07-16',
  '2026-08-15',
  '2026-09-18',
  '2026-09-19',
  '2026-10-12',
  '2026-10-31',
  '2026-11-01',
  '2026-12-08',
  '2026-12-25',
]);

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isBusinessDay(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !HOLIDAYS.has(toYmd(d));
}

/** Próximos `count` días hábiles desde hoy (incluye hoy si es hábil). */
export function nextBusinessDays(count: number, from = new Date()): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  let guard = 0;
  while (days.length < count && guard < 60) {
    if (isBusinessDay(cursor)) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayChip(d: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDayLong(d: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDayShortSelected(d: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const BASE_SLOTS = ['09:00', '09:30', '10:00', '11:30', '14:00', '15:00', '16:30', '17:00'];

/**
 * Disponibilidad mock. Estructura lista para reemplazar por
 * GET /api/disponibilidad?fecha=YYYY-MM-DD
 */
export function getMockSlotsForDate(date: Date): TimeSlot[] {
  const ymd = toYmd(date);
  const occupiedIndex = ymd.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % BASE_SLOTS.length;
  const second = (occupiedIndex + 3) % BASE_SLOTS.length;

  return BASE_SLOTS.map((time, i) => ({
    time,
    status: i === occupiedIndex || i === second ? 'occupied' : 'available',
  }));
}

export function formatRutInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (cleaned.length <= 1) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

export function isValidRut(rut: string): boolean {
  const cleaned = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === expectedDv;
}

export function ageFromBirthDate(isoDate: string): number | null {
  if (!isoDate) return null;
  const birth = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function calcImc(pesoKg: number, alturaCm: number): number | null {
  if (!Number.isFinite(pesoKg) || !Number.isFinite(alturaCm) || pesoKg <= 0 || alturaCm <= 0) {
    return null;
  }
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

export type ImcCategory = {
  label: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
};

export function imcCategory(imc: number): ImcCategory {
  if (imc < 18.5) return { label: 'Bajo peso', tone: 'blue' };
  if (imc < 25) return { label: 'Normal', tone: 'green' };
  if (imc < 30) return { label: 'Sobrepeso', tone: 'amber' };
  return { label: 'Obesidad', tone: 'red' };
}
