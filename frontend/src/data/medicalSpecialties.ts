export const MEDICAL_SPECIALTIES = [
  'Medicina general',
  'Pediatría',
  'Cardiología',
  'Psiquiatría',
  'Traumatología',
  'Ginecología',
  'Dermatología',
  'Medicina interna',
  'Neurología',
  'Reumatología',
  'Geriatría',
  'Broncopulmonar',
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];

/** Tipo de formación / experiencia (independiente del área clínica). */
export const KNOWLEDGE_CREDENTIALS = [
  'Especialista',
  'Magíster',
  'Diplomado',
  'Cursos',
  'Experiencias laborales',
] as const;

export type KnowledgeCredential = (typeof KNOWLEDGE_CREDENTIALS)[number];

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
  { title: 'Neurología', price: 'Desde $59.990', eta: 'Disponible en 40 min', icon: 'activity' },
  { title: 'Reumatología', price: 'Desde $49.990', eta: 'Disponible en 40 min', icon: 'pulse' },
  { title: 'Geriatría', price: 'Desde $49.990', eta: 'Disponible en 35 min', icon: 'user' },
  { title: 'Broncopulmonar', price: 'Desde $55.990', eta: 'Disponible en 40 min', icon: 'activity' },
];

function normalizeListed(value: string, list: readonly string[]): string | null {
  const match = list.find((item) => item.toLowerCase() === value.toLowerCase());
  return match || null;
}

export function parseSpecialtyList(value?: string | null): string[] {
  if (!value) return [];
  const withoutFlag = value
    .replace(/^Formación:\s*.+?\s*·\s*/i, '')
    .replace(/^Especialista\s*[·:]\s*/i, '');
  return withoutFlag
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeListed(s, MEDICAL_SPECIALTIES) || s);
}

/** Persiste formación + áreas clínicas en specialty (sin migración). */
export function decodeDoctorSpecialty(value?: string | null): {
  isSpecialist: boolean;
  credentials: string[];
  areas: string[];
} {
  const raw = (value || '').trim();
  let credentials: string[] = [];
  let rest = raw;

  const formacionMatch = raw.match(/^Formación:\s*(.+?)\s*·\s*(.*)$/i);
  if (formacionMatch) {
    credentials = formacionMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => normalizeListed(s, KNOWLEDGE_CREDENTIALS) || s)
      .filter((s) => (KNOWLEDGE_CREDENTIALS as readonly string[]).includes(s));
    rest = formacionMatch[2];
  } else if (/^Especialista\s*[·:]/i.test(raw)) {
    credentials = ['Especialista'];
    rest = raw.replace(/^Especialista\s*[·:]\s*/i, '');
  }

  const areas = parseSpecialtyList(rest).filter((s) =>
    (MEDICAL_SPECIALTIES as readonly string[]).includes(s),
  );

  return {
    isSpecialist: credentials.includes('Especialista'),
    credentials,
    areas: areas.length > 0 ? areas : [MEDICAL_SPECIALTIES[0]],
  };
}

export function encodeDoctorSpecialty(credentials: string[], areas: string[]): string {
  const creds = credentials.filter((c) => (KNOWLEDGE_CREDENTIALS as readonly string[]).includes(c));
  const list = areas.length > 0 ? areas : [MEDICAL_SPECIALTIES[0]];
  const joinedAreas = list.join(', ');
  if (creds.length === 0) return joinedAreas;
  return `Formación: ${creds.join(', ')} · ${joinedAreas}`;
}
