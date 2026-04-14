import type { LabExamRequestStatusApi } from './labExamTypes';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function getLabApiStatusLabel(status: LabExamRequestStatusApi): string {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'PENDING_QUOTES':
      return 'Solicitud enviada';
    case 'QUOTED':
      return 'Cotización disponible';
    case 'LAB_SELECTED':
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
    case 'EXPIRED':
      return 'Sin cotizaciones';
    default:
      return status;
  }
}

export function getLabApiStatusTone(status: LabExamRequestStatusApi): Tone {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_QUOTES':
      return 'info';
    case 'QUOTED':
      return 'warning';
    case 'LAB_SELECTED':
    case 'RESULTS_READY':
    case 'COMPLETED':
      return 'success';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'danger';
    case 'SCHEDULED':
    case 'SAMPLE_COLLECTED':
      return 'neutral';
    default:
      return 'neutral';
  }
}
