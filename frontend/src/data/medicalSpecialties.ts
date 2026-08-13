export const MEDICAL_SPECIALTIES = [
  'Medicina general',
  'Pediatría',
  'Cardiología',
  'Psiquiatría',
  'Traumatología',
  'Ginecología',
  'Dermatología',
  'Medicina interna',
  'Medicina estética',
  'Neurología',
  'Reumatología',
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];

export const MEDICAL_SPECIALTY_CARDS: ReadonlyArray<{
  title: MedicalSpecialty;
  price: string;
  eta: string;
  icon: 'briefcase' | 'heart' | 'activity' | 'shield' | 'file' | 'user' | 'pulse' | 'crosshair' | 'star';
}> = [
  { title: 'Medicina general', price: 'Desde $39.990', eta: 'Disponible en 18 min', icon: 'briefcase' },
  { title: 'Pediatría', price: 'Desde $49.990', eta: 'Disponible en 30 min', icon: 'heart' },
  { title: 'Cardiología', price: 'Desde $59.990', eta: 'Disponible en 45 min', icon: 'activity' },
  { title: 'Psiquiatría', price: 'Desde $49.990', eta: 'Disponible en 40 min', icon: 'shield' },
  { title: 'Traumatología', price: 'Desde $49.990', eta: 'Disponible en 35 min', icon: 'file' },
  { title: 'Ginecología', price: 'Desde $45.990', eta: 'Disponible en 30 min', icon: 'user' },
  { title: 'Dermatología', price: 'Desde $39.990', eta: 'Disponible en 25 min', icon: 'pulse' },
  { title: 'Medicina interna', price: 'Desde $55.990', eta: 'Disponible en 40 min', icon: 'crosshair' },
  { title: 'Medicina estética', price: 'Desde $49.990', eta: 'Disponible en 35 min', icon: 'star' },
  { title: 'Neurología', price: 'Desde $59.990', eta: 'Disponible en 40 min', icon: 'activity' },
  { title: 'Reumatología', price: 'Desde $49.990', eta: 'Disponible en 40 min', icon: 'pulse' },
];

export function parseSpecialtyList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const match = MEDICAL_SPECIALTIES.find((listed) => listed.toLowerCase() === s.toLowerCase());
      return match || s;
    });
}
