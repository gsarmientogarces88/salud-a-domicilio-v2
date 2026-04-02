/**
 * Store en memoria + localStorage para solicitudes de exámenes a domicilio
 * y resultados subidos por el laboratorio (sin backend por ahora).
 */

const REQUESTS_KEY = 'salud_home_exam_requests';
const QUOTES_KEY = 'salud_home_exam_quotes';
const EVENTS_KEY = 'salud_home_exam_events';
const COUNTER_KEY = 'salud_home_exam_counter';
const ACTIVE_BY_PATIENT_KEY = 'salud_home_exam_active_by_patient';
const RESULTS_KEY = 'salud_home_exam_results';

export type HomeExamRequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'RESULT_READY'
  | 'CANCELLED';

export interface HomeExamRequest {
  id: string;
  displayId: string; // "EXA-000123"
  patientId: string;
  patientName: string;
  address: string;
  phone: string;
  comuna: string;
  comments?: string;
  preferredTime?: string;
  orderFileName?: string;
  createdAt: string;
  updatedAt: string;
  status: HomeExamRequestStatus;
  // campos internos mock para simular el flujo en front
  mock?: {
    nextReviewAt?: string; // ISO
    quoteAt?: string; // ISO
  };
}

export interface HomeExamQuote {
  id: string;
  requestId: string;
  labName: string;
  examsIncluded: string[];
  totalPrice: number;
  includesHomeVisit: boolean;
  estimatedVisitTime: string;
  fastingInstructions?: string;
  observations?: string;
  status: 'ACTIVE' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface HomeExamRequestEvent {
  id: string;
  requestId: string;
  type:
    | 'REQUEST_CREATED'
    | 'ORDER_RECEIVED'
    | 'UNDER_REVIEW'
    | 'QUOTED'
    | 'QUOTE_ACCEPTED'
    | 'QUOTE_REJECTED'
    | 'SCHEDULED'
    | 'SAMPLE_COLLECTED'
    | 'RESULT_READY'
    | 'CANCELLED'
    | 'NOTE';
  message: string;
  createdAt: string;
}

export interface LabExamResult {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  labName: string;
  examDate: string;
  fileName: string;
  fileDataUrl: string; // base64 data URL para descarga en front
  createdAt: string;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function nowIso() {
  return new Date().toISOString();
}

function nextCounter(): number {
  const current = loadJson<number>(COUNTER_KEY, 0);
  const next = current + 1;
  saveJson(COUNTER_KEY, next);
  return next;
}

function makeDisplayId(n: number) {
  return `EXA-${String(n).padStart(6, '0')}`;
}

export function getExamRequests(): HomeExamRequest[] {
  return loadJson<HomeExamRequest[]>(REQUESTS_KEY, []);
}

export function getExamRequestById(id: string): HomeExamRequest | null {
  return getExamRequests().find((r) => r.id === id) || null;
}

export function getExamRequestsByPatient(patientId: string): HomeExamRequest[] {
  return getExamRequests().filter((r) => r.patientId === patientId);
}

export function getExamEventsByRequest(requestId: string): HomeExamRequestEvent[] {
  return loadJson<HomeExamRequestEvent[]>(EVENTS_KEY, [])
    .filter((e) => e.requestId === requestId)
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export function getExamQuoteByRequest(requestId: string): HomeExamQuote | null {
  return loadJson<HomeExamQuote[]>(QUOTES_KEY, []).find((q) => q.requestId === requestId) || null;
}

export function getActiveExamRequestId(patientId: string): string | null {
  const map = loadJson<Record<string, string | null>>(ACTIVE_BY_PATIENT_KEY, {});
  return map[patientId] || null;
}

export function setActiveExamRequestId(patientId: string, requestId: string | null) {
  const map = loadJson<Record<string, string | null>>(ACTIVE_BY_PATIENT_KEY, {});
  map[patientId] = requestId;
  saveJson(ACTIVE_BY_PATIENT_KEY, map);
}

function updateRequestInternal(id: string, patch: Partial<HomeExamRequest>): HomeExamRequest {
  const requests = getExamRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Solicitud no encontrada');
  const updated: HomeExamRequest = {
    ...requests[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  requests[idx] = updated;
  saveJson(REQUESTS_KEY, requests);
  return updated;
}

function addEventInternal(e: Omit<HomeExamRequestEvent, 'id' | 'createdAt'>) {
  const events = loadJson<HomeExamRequestEvent[]>(EVENTS_KEY, []);
  const created: HomeExamRequestEvent = {
    ...e,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: nowIso(),
  };
  events.push(created);
  saveJson(EVENTS_KEY, events);
  return created;
}

function upsertQuoteInternal(
  q: Omit<HomeExamQuote, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<HomeExamQuote, 'id'>>
) {
  const quotes = loadJson<HomeExamQuote[]>(QUOTES_KEY, []);
  const existingIdx = quotes.findIndex((x) => x.requestId === q.requestId);
  const ts = nowIso();

  if (existingIdx === -1) {
    const created: HomeExamQuote = {
      id: q.id || `quo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      requestId: q.requestId,
      labName: q.labName,
      examsIncluded: q.examsIncluded,
      totalPrice: q.totalPrice,
      includesHomeVisit: q.includesHomeVisit,
      estimatedVisitTime: q.estimatedVisitTime,
      fastingInstructions: q.fastingInstructions,
      observations: q.observations,
      status: q.status,
      createdAt: ts,
      updatedAt: ts,
    };
    quotes.push(created);
    saveJson(QUOTES_KEY, quotes);
    return created;
  }

  const updated: HomeExamQuote = {
    ...quotes[existingIdx],
    ...q,
    updatedAt: ts,
  } as HomeExamQuote;
  quotes[existingIdx] = updated;
  saveJson(QUOTES_KEY, quotes);
  return updated;
}

export function addExamRequest(
  r: Omit<HomeExamRequest, 'id' | 'displayId' | 'createdAt' | 'updatedAt' | 'status' | 'mock'>
): HomeExamRequest {
  const requests = getExamRequests();
  const counter = nextCounter();
  const ts = nowIso();

  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created: HomeExamRequest = {
    ...r,
    id,
    displayId: makeDisplayId(counter),
    status: 'PENDING',
    createdAt: ts,
    updatedAt: ts,
    mock: {
      nextReviewAt: new Date(Date.now() + (5_000 + Math.floor(Math.random() * 10_000))).toISOString(),
      quoteAt: new Date(Date.now() + (20_000 + Math.floor(Math.random() * 25_000))).toISOString(),
    },
  };

  requests.push(created);
  saveJson(REQUESTS_KEY, requests);

  setActiveExamRequestId(created.patientId, created.id);
  addEventInternal({ requestId: created.id, type: 'REQUEST_CREATED', message: 'Solicitud enviada' });
  addEventInternal({ requestId: created.id, type: 'ORDER_RECEIVED', message: 'Orden médica recibida' });

  return created;
}

export function cancelExamRequest(requestId: string, reason?: string) {
  const req = getExamRequestById(requestId);
  if (!req) throw new Error('Solicitud no encontrada');
  const updated = updateRequestInternal(requestId, { status: 'CANCELLED' });
  addEventInternal({
    requestId,
    type: 'CANCELLED',
    message: reason?.trim() ? `Solicitud cancelada: ${reason.trim()}` : 'Solicitud cancelada',
  });
  setActiveExamRequestId(updated.patientId, null);
  return updated;
}

export function acceptExamQuote(requestId: string) {
  const quote = getExamQuoteByRequest(requestId);
  if (!quote) throw new Error('No hay cotización para aceptar');
  upsertQuoteInternal({ ...quote, status: 'ACCEPTED' });
  const updated = updateRequestInternal(requestId, { status: 'QUOTE_ACCEPTED' });
  addEventInternal({ requestId, type: 'QUOTE_ACCEPTED', message: 'Cotización aceptada' });
  return updated;
}

export function rejectExamQuote(requestId: string) {
  const quote = getExamQuoteByRequest(requestId);
  if (!quote) throw new Error('No hay cotización para rechazar');
  upsertQuoteInternal({ ...quote, status: 'REJECTED' });
  const updated = updateRequestInternal(requestId, { status: 'QUOTE_REJECTED' });
  addEventInternal({ requestId, type: 'QUOTE_REJECTED', message: 'Cotización rechazada' });
  setActiveExamRequestId(updated.patientId, null);
  return updated;
}

export function addExamClarification(requestId: string, message: string) {
  const text = message.trim();
  if (!text) throw new Error('Escribe tu mensaje para solicitar aclaración.');
  addEventInternal({ requestId, type: 'NOTE', message: `Aclaración solicitada: ${text}` });
}

/**
 * Actualiza el flujo mock (sin backend) en base al tiempo transcurrido.
 * Se llama desde polling en el front.
 */
export function tickMockExamRequest(requestId: string) {
  const req = getExamRequestById(requestId);
  if (!req) return null;

  const status = req.status;
  if (status === 'CANCELLED' || status === 'RESULT_READY') return req;
  if (status === 'QUOTE_REJECTED') return req;

  const now = Date.now();
  const nextReviewAt = req.mock?.nextReviewAt ? +new Date(req.mock.nextReviewAt) : null;
  const quoteAt = req.mock?.quoteAt ? +new Date(req.mock.quoteAt) : null;

  if (status === 'PENDING' && nextReviewAt && now >= nextReviewAt) {
    const updated = updateRequestInternal(requestId, { status: 'UNDER_REVIEW' });
    addEventInternal({ requestId, type: 'UNDER_REVIEW', message: 'En revisión por laboratorio' });
    return updated;
  }

  if ((status === 'PENDING' || status === 'UNDER_REVIEW') && quoteAt && now >= quoteAt) {
    if (!getExamQuoteByRequest(requestId)) {
      upsertQuoteInternal({
        requestId,
        labName: 'Laboratorio Clínico Central',
        examsIncluded: ['Hemograma', 'Perfil bioquímico', 'TSH'],
        totalPrice: 39990,
        includesHomeVisit: true,
        estimatedVisitTime: '60–90 min',
        fastingInstructions: 'Ayuno de 8 horas (si aplica). Mantén hidratación con agua.',
        observations: 'El valor incluye toma a domicilio dentro del radio urbano.',
        status: 'ACTIVE',
      });
    }
    const updated = updateRequestInternal(requestId, { status: 'QUOTED' });
    addEventInternal({ requestId, type: 'QUOTED', message: 'Cotización emitida' });
    return updated;
  }

  return req;
}

export function getLabResults(): LabExamResult[] {
  return loadJson<LabExamResult[]>(RESULTS_KEY, []);
}

export function getLabResultsByPatient(patientId: string): LabExamResult[] {
  return getLabResults().filter((r) => r.patientId === patientId);
}

export function addLabResult(r: Omit<LabExamResult, 'id' | 'createdAt'>): LabExamResult {
  const results = getLabResults();
  const created: LabExamResult = {
    ...r,
    id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  results.push(created);
  saveJson(RESULTS_KEY, results);

  const req = getExamRequestById(r.requestId);
  if (req) {
    updateRequestInternal(r.requestId, { status: 'RESULT_READY' });
    addEventInternal({ requestId: r.requestId, type: 'RESULT_READY', message: 'Resultados disponibles' });
  }

  return created;
}
