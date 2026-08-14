'use client';

const COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  QUEUED: 'bg-sky-100 text-sky-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-200 text-gray-800',
};

const LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  QUEUED: 'En cola',
  ACCEPTED: 'Aceptada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${COLORS[status] || 'bg-gray-100'}`}>
      {label?.trim() || LABELS[status] || status.replace(/_/g, ' ')}
    </span>
  );
}
