/** Tipos alineados con GET /api/patient/lab-exams */

export type LabExamRequestStatusApi =
  | 'DRAFT'
  | 'PENDING_QUOTES'
  | 'QUOTED'
  | 'LAB_SELECTED'
  | 'SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'RESULTS_READY'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface LabQuoteApi {
  id: string;
  status: 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  laboratory: { id: string; name: string; phone?: string | null } | null;
  priceClp: number;
  proposedDate: string | null;
  proposedTimeRange: string | null;
  comment: string | null;
  estimatedResultsHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResultApi {
  id: string;
  fileName: string;
  fileUrl: string;
  observations: string | null;
  published: boolean;
  publishedAt: string | null;
}

export interface LabExamEventApi {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
}

export interface PatientLabExamRequestDto {
  id: string;
  displayId: string;
  status: LabExamRequestStatusApi;
  patientName: string;
  examRequested: string;
  address: string;
  region: string;
  province: string;
  commune: string;
  phone: string;
  email: string;
  observationsPatient?: string | null;
  preferredDate?: string | null;
  preferredTimeRange?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  quoteDeadlineAt: string;
  selectedQuoteId?: string | null;
  orderFileUrl?: string | null;
  orderFileName?: string | null;
  labRejectionReason?: string | null;
  selectedQuote?: LabQuoteApi | null;
  quotes: LabQuoteApi[];
  appointments: { id: string; startAt: string; endAt: string | null; status: string; notes?: string | null }[];
  results: LabResultApi[];
  events: LabExamEventApi[];
  createdAt: string;
  updatedAt: string;
}
