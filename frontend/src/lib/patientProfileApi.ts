import { apiFetch } from './api';

export interface PatientProfileBundle {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

export async function fetchPatientProfile() {
  return apiFetch<{ data: PatientProfileBundle }>('/patient/profile');
}

export async function updatePatientProfile(body: Record<string, unknown>) {
  return apiFetch<{ data: PatientProfileBundle }>('/patient/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
