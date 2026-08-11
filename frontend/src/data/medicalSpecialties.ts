export const MEDICAL_SPECIALTIES = [
  'Medicina General',
  'Pediatría',
  'Dermatología',
  'Cardiología',
  'Ginecología',
  'Traumatología',
  'Psiquiatría',
  'Medicina Interna',
  'Medicina estética',
  'Neurología',
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];
