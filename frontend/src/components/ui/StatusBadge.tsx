'use client';

const COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${COLORS[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
