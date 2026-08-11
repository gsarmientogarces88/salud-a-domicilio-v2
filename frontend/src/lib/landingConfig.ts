/** Centralized landing/marketing config — easy to edit. */

export const LANDING_STATS = {
  patientsServed: '+3.200',
  patientsLabel: 'Pacientes atendidos',
  professionals: '48',
  professionalsLabel: 'Profesionales activos',
  rating: '4.9/5',
  ratingLabel: 'Calificación',
  avgArrival: '15 min',
  avgArrivalLabel: 'Tiempo promedio',
} as const;

export const LANDING_CONTACT = {
  phoneDisplay: '+56 9 8765 4321',
  phoneTel: '+56987654321',
  email: 'contacto@medicilio.cl',
  whatsappNumber: '56987654321',
  whatsappMessage: 'Hola Medicilio, necesito información sobre atención médica a domicilio.',
  address: 'Gran Concepción, Chile',
  coverage: 'Gran Concepción',
} as const;

export function whatsappUrl(message: string = LANDING_CONTACT.whatsappMessage): string {
  return `https://wa.me/${LANDING_CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const LANDING_ROUTES = {
  login: '/auth/login',
  register: '/auth/register',
  urgency: '/dashboard/patient/medico',
  schedule: '/dashboard/patient/medico/agendar',
  exams: '/dashboard/patient/examenes-domicilio',
  weightLoss: '/dashboard/patient/baja-peso',
  labPortal: '/auth/laboratorio/login',
  terms: '/terminos',
  privacy: '/privacidad',
} as const;

export const SERVICE_PRICES = {
  urgency: '$50.000',
  scheduleFrom: '$39.990',
  examsFrom: '$19.990',
  weightLossFrom: '$79.990',
} as const;
