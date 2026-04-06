'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import StaticPreviewMap from '@/components/maps/StaticPreviewMap';

interface RequestItem {
  id: string;
  status: string;
  commune: string;
  addressDisplay?: string;
  distanceKm?: string | null;
  patientLocation?: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  notes: string | null;
  createdAt: string;
  slot: { startAt: string; endAt: string };
  payment: { amount: number; status: string };
  patient: { user: { firstName: string; lastName: string } };
  professional?: { user?: { firstName: string; lastName: string }; specialty?: string };
}

export default function AgendaRequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; show: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: RequestItem[] }>('/agenda/requests?status=PENDING');
      setRequests(res.data || []);
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await apiFetch(`/agenda/requests/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (e: any) {
      alert(e.message || 'Error al aceptar');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason) return;
    const id = rejectModal.id;
    setRejectingId(id);
    try {
      await apiFetch(`/agenda/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: rejectReason,
          comment: rejectComment.trim() || undefined,
        }),
      });
      setRejectModal(null);
      setRejectReason('');
      setRejectComment('');
      await load();
    } catch (e: any) {
      alert(e.message || 'Error al rechazar');
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Agenda</h1>
          <p className="text-sm text-gray-600">
            Revisa y acepta o rechaza las solicitudes pendientes de visita a domicilio.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando solicitudes...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No hay solicitudes pendientes.</p>
          <p className="mt-1 text-sm text-gray-400">
            Cuando un paciente envíe una solicitud de agenda, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const slotTime = r.slot
              ? new Date(r.slot.startAt).toLocaleString('es-CL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-';
            const isAccepting = acceptingId === r.id;
            const isRejecting = rejectingId === r.id;
            const isDisabled = isAccepting || isRejecting;

            const loc = r.patientLocation ?? (r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null);

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {r.patient?.user?.firstName} {r.patient?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      📍 Comuna {r.addressDisplay || r.commune}
                      {r.distanceKm != null && ` · ~${r.distanceKm} km (estimado)`}
                    </p>
                    <p className="text-xs text-gray-500">Ubicación aproximada en mapa para decidir cobertura.</p>
                    <p className="text-sm text-gray-500">{slotTime}</p>
                    {r.notes && (
                      <p className="mt-1 text-xs text-gray-500">Motivo: {r.notes}</p>
                    )}
                    <p className="mt-2 font-semibold text-gray-900">
                      $ {(r.payment?.amount || 0).toLocaleString('es-CL')} CLP
                    </p>
                    {loc && (
                      <div className="mt-4 max-w-md">
                        <StaticPreviewMap position={loc} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(r.id)}
                      disabled={isDisabled}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isAccepting ? 'Aceptando...' : 'Aceptar'}
                    </button>
                    <button
                      onClick={() =>
                        setRejectModal({ id: r.id, show: true })
                      }
                      disabled={isDisabled}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {isRejecting ? 'Rechazando...' : 'Rechazar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal rechazo */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              Motivo del rechazo (obligatorio)
            </h3>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un motivo</option>
              <option value="DISTANCIA">Distancia</option>
              <option value="ZONA">Zona</option>
              <option value="HORARIO">Horario</option>
              <option value="OTRO">Otro</option>
            </select>
            <label className="mb-2 block text-sm text-gray-600">
              Comentario (opcional)
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Detalle si lo deseas"
              rows={2}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                  setRejectComment('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason || rejectingId !== null}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectingId ? 'Enviando...' : 'Enviar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
