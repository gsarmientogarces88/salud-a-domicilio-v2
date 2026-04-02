import { apiFetch, apiFetchForm } from './api';

export async function fetchLabDashboard() {
  return apiFetch<{ data: { counts: Record<string, number>; laboratory: { id: string; name: string } } }>(
    '/laboratory/dashboard'
  );
}

export async function fetchLabRequests(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<{ data: unknown[] }>(`/laboratory/requests${q}`);
}

export async function fetchLabRequest(id: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}`);
}

export async function postLabReview(id: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/review`, { method: 'POST', body: '{}' });
}

export async function postLabReject(id: string, reason: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function postLabQuote(id: string, body: Record<string, unknown>) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/quote`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postLabSchedule(id: string, body: Record<string, unknown>) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/schedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postSampleCollected(id: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/sample-collected`, { method: 'POST', body: '{}' });
}

export async function postLabComplete(id: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/requests/${id}/complete`, { method: 'POST', body: '{}' });
}

export async function postLabResult(requestId: string, form: FormData) {
  return apiFetchForm<{ data: unknown }>(`/laboratory/requests/${requestId}/results`, form);
}

export async function publishLabResult(resultId: string) {
  return apiFetch<{ data: unknown }>(`/laboratory/results/${resultId}/publish`, { method: 'POST', body: '{}' });
}

export async function fetchLabCalendar(from: string, to: string) {
  return apiFetch<{ data: { appointments: unknown[]; blocked: unknown[] } }>(
    `/laboratory/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function postBlockedSlot(body: { date: string; startTime: string; endTime: string; reason?: string }) {
  return apiFetch<{ data: unknown }>('/laboratory/blocked-slots', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteBlockedSlot(id: string) {
  return apiFetch<{ message: string }>(`/laboratory/blocked-slots/${id}`, { method: 'DELETE' });
}

export async function patchLabAppointment(appointmentId: string, body: Record<string, unknown>) {
  return apiFetch<{ data: unknown }>(`/laboratory/appointments/${appointmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
