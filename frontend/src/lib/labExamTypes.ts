/** Tipos alineados con GET /api/patient/lab-exams */

export type LabExamRequestStatusApi =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'QUOTED'
  | 'REJECTED'
  | 'PATIENT_ACCEPTED'
  | 'SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'RESULTS_READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LabQuoteApi {
  id: string;
  priceClp: number;
  proposedVisitAt: string | null;
  proposedVisitEndAt: string | null;
  labObservations: string | null;
  estimatedResultsHours: number | null;
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
  commune: string;
  phone: string;
  observationsPatient?: string | null;
  preferredTime?: string | null;
  orderFileUrl?: string | null;
  orderFileName?: string | null;
  labRejectionReason?: string | null;
  laboratory?: { id: string; name: string; phone?: string | null } | null;
  quote: LabQuoteApi | null;
  appointments: { id: string; startAt: string; endAt: string | null; status: string; notes?: string | null }[];
  results: LabResultApi[];
  events: LabExamEventApi[];
  createdAt: string;
  updatedAt: string;
}
