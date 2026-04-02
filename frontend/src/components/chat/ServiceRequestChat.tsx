'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type SenderType = 'PATIENT' | 'DOCTOR';

export type ChatMessage = {
  id: string;
  serviceRequestId: string;
  senderType: SenderType;
  senderUserId: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function ServiceRequestChat(props: {
  requestId: string;
  currentUserRole: 'PATIENT' | 'DOCTOR';
  title?: string;
  quickMessages?: string[];
}) {
  const { requestId, currentUserRole, title = 'Chat', quickMessages = [] } = props;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [canWrite, setCanWrite] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = await apiFetch<{ data: { messages: ChatMessage[]; canWrite: boolean } }>(`/services/${requestId}/chat`);
      setMessages(res.data.messages || []);
      setCanWrite(Boolean(res.data.canWrite));
      // eslint-disable-next-line no-console
      console.log('[chat.load]', { requestId, count: res.data.messages?.length, canWrite: res.data.canWrite });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[chat.load] error', { requestId, message: e?.message || e });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m) return;
    if (!canWrite) return;
    setSending(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[chat.send] attempt', { requestId, role: currentUserRole, message: m });
      await apiFetch(`/services/${requestId}/chat`, { method: 'POST', body: JSON.stringify({ message: m }) });
      setText('');
      await load();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[chat.send] error', { requestId, message: e?.message || e });
      alert(e?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const chips = useMemo(() => quickMessages.slice(0, 8), [quickMessages]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {!canWrite && (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
            Solo lectura
          </span>
        )}
      </div>

      {chips.length > 0 && canWrite && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText((prev) => (prev ? `${prev} ${q}` : q))}
              className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="h-64 overflow-y-auto rounded-xl bg-gray-50 p-3">
        {loading ? (
          <p className="text-xs text-gray-500">Cargando chat…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-500">Aún no hay mensajes.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = (currentUserRole === 'PATIENT' && m.senderType === 'PATIENT') || (currentUserRole === 'DOCTOR' && m.senderType === 'DOCTOR');
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine ? 'bg-sky-600 text-white' : 'bg-white text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    <p className={`mt-1 text-[11px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>
                      {formatTime(m.createdAt)} · {m.senderType === 'DOCTOR' ? 'Médico' : 'Paciente'}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canWrite || sending}
          placeholder={canWrite ? 'Escribe un mensaje…' : 'Chat cerrado'}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-300"
        />
        <button
          type="button"
          onClick={() => send(text)}
          disabled={!canWrite || sending || !text.trim()}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

