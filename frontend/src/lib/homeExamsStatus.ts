import type { HomeExamRequestStatus } from './homeExamsStore';

export function getHomeExamStatusLabel(status: HomeExamRequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Solicitud enviada';
    case 'UNDER_REVIEW':
      return 'En revisión por laboratorio';
    case 'QUOTED':
      return 'Cotización disponible';
    case 'QUOTE_ACCEPTED':
      return 'Cotización aceptada';
    case 'QUOTE_REJECTED':
      return 'Cotización rechazada';
    case 'SCHEDULED':
      return 'Visita agendada';
    case 'SAMPLE_COLLECTED':
      return 'Muestra tomada';
    case 'RESULT_READY':
      return 'Resultados disponibles';
    case 'CANCELLED':
      return 'Solicitud cancelada';
    default:
      return status;
  }
}

export function getHomeExamStatusTone(status: HomeExamRequestStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'info';
    case 'QUOTED':
      return 'warning';
    case 'QUOTE_ACCEPTED':
    case 'RESULT_READY':
      return 'success';
    case 'QUOTE_REJECTED':
    case 'CANCELLED':
      return 'danger';
    case 'SCHEDULED':
    case 'SAMPLE_COLLECTED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

