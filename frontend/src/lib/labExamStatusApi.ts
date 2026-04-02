import type { LabExamRequestStatusApi } from './labExamTypes';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function getLabApiStatusLabel(status: LabExamRequestStatusApi): string {
  switch (status) {
    case 'PENDING':
      return 'Solicitud enviada';
    case 'IN_REVIEW':
      return 'En revisión';
    case 'QUOTED':
      return 'Cotización disponible';
    case 'REJECTED':
      return 'Rechazada por laboratorio';
    case 'PATIENT_ACCEPTED':
      return 'Cotización aceptada';
    case 'SCHEDULED':
      return 'Visita agendada';
    case 'SAMPLE_COLLECTED':
      return 'Muestra tomada';
    case 'RESULTS_READY':
      return 'Resultados disponibles';
    case 'COMPLETED':
      return 'Completado';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

export function getLabApiStatusTone(status: LabExamRequestStatusApi): Tone {
  switch (status) {
    case 'PENDING':
    case 'IN_REVIEW':
      return 'info';
    case 'QUOTED':
      return 'warning';
    case 'PATIENT_ACCEPTED':
    case 'RESULTS_READY':
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    case 'SCHEDULED':
    case 'SAMPLE_COLLECTED':
      return 'neutral';
    default:
      return 'neutral';
  }
}
