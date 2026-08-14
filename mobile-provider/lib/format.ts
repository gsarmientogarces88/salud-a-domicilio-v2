import type { ServiceRequest } from './types';

export function clp(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function patientName(s: Pick<ServiceRequest, 'pacienteNombre' | 'patient'>) {
  if (s.pacienteNombre?.trim()) return s.pacienteNombre.trim();
  const u = s.patient?.user;
  if (u) {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    if (name) return name;
  }
  return 'Paciente';
}

export function placeLabel(s: Pick<ServiceRequest, 'commune' | 'city' | 'province' | 'address'>) {
  return s.commune || s.city || s.province || s.address || 'Domicilio';
}

export function formatTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export function remainingLabel(seconds?: number | null) {
  if (seconds == null) return null;
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptada',
    QUEUED: 'En cola',
    IN_PROGRESS: 'En domicilio',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    REJECTED: 'Rechazada',
    CONFIRMED: 'Confirmada',
  };
  return map[status] || status;
}
