import { apiFetch, apiFetchForm } from './api';
import type { PatientLabExamRequestDto } from './labExamTypes';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetchPublicLaboratories() {
  return apiFetch<{ data: { id: string; name: string; commune: string | null; city: string | null; region: string | null; phone: string | null }[] }>(
    '/laboratories'
  );
}

export async function fetchPatientLabExams() {
  return apiFetch<{ data: PatientLabExamRequestDto[] }>('/patient/lab-exams');
}

export async function fetchPatientLabExam(id: string) {
  return apiFetch<{ data: PatientLabExamRequestDto }>(`/patient/lab-exams/${id}`);
}

export async function createPatientLabExam(form: FormData) {
  return apiFetchForm<{ data: PatientLabExamRequestDto }>('/patient/lab-exams', form);
}

export async function acceptPatientQuote(requestId: string) {
  return apiFetch<{ data: PatientLabExamRequestDto }>(`/patient/lab-exams/${requestId}/accept-quote`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rejectPatientQuote(requestId: string) {
  return apiFetch<{ data: PatientLabExamRequestDto }>(`/patient/lab-exams/${requestId}/reject-quote`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function cancelPatientLabExam(requestId: string, reason?: string) {
  return apiFetch<{ data: PatientLabExamRequestDto }>(`/patient/lab-exams/${requestId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function getResultDownloadUrl(requestId: string, resultId: string) {
  return `${BASE}/patient/lab-exams/${requestId}/result-file/${resultId}`;
}
