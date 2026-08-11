/**
 * Helpers para separar Solicitante (titular de cuenta) vs Paciente (quien recibe atención).
 */

export type ServicePartyFields = {
  description?: string | null;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  patient?: {
    dateOfBirth?: string | Date | null;
    user?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Extrae motivo limpio y nombre legacy si description trae "Paciente: …". */
export function parseMotivoAndPaciente(description: string | null | undefined) {
  const raw = (description || '').trim();
  const match = raw.match(/\n\nPaciente:\s*(.+)\s*$/m);
  return {
    motivo: raw.replace(/\n\nPaciente:\s*.+$/m, '').trim() || raw,
    pacienteFromDesc: match?.[1]?.trim() || null,
  };
}

export function solicitanteLabel(s: ServicePartyFields) {
  const first = s.patient?.user?.firstName?.trim() || '';
  const last = s.patient?.user?.lastName?.trim() || '';
  const full = `${first} ${last}`.trim();
  return full || 'Solicitante';
}

export function ageFromDateOfBirth(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function resolvePacienteNombre(s: ServicePartyFields): string | null {
  const fromField = s.pacienteNombre?.trim() || null;
  if (fromField) return fromField;
  return parseMotivoAndPaciente(s.description).pacienteFromDesc;
}

export function isSameAsSolicitante(s: ServicePartyFields, pacienteNombre: string | null) {
  if (!pacienteNombre) return true;
  return normalizeName(pacienteNombre) === normalizeName(solicitanteLabel(s));
}

/** Texto de paciente para tablas/cards: "Mismo solicitante" o "Nombre (N años)". */
export function pacienteDisplayLabel(
  s: ServicePartyFields,
  opts?: { graySame?: boolean },
): { text: string; isSame: boolean; className?: string } {
  const nombre = resolvePacienteNombre(s);
  const same = isSameAsSolicitante(s, nombre);
  if (same) {
    return {
      text: 'Mismo solicitante',
      isSame: true,
      className: opts?.graySame === false ? undefined : 'text-gray-400',
    };
  }
  const age = s.edadPaciente;
  return {
    text: age != null ? `${nombre} (${age} años)` : nombre || 'Paciente',
    isSame: false,
  };
}

/** "Ignacia Solari · 8 años" o "Mismo solicitante" para detalle de atención. */
export function pacienteAtendidoLabel(s: ServicePartyFields) {
  const nombre = resolvePacienteNombre(s);
  const same = isSameAsSolicitante(s, nombre);
  if (same) return 'Mismo solicitante';
  if (s.edadPaciente != null) return `${nombre} · ${s.edadPaciente} años`;
  return nombre || 'Paciente';
}

/** "Ignacia Pérez, 8 años" para cards de solicitudes. */
export function pacienteInlineLabel(s: ServicePartyFields) {
  const nombre = resolvePacienteNombre(s);
  const same = isSameAsSolicitante(s, nombre);
  if (same) {
    const base = solicitanteLabel(s);
    return s.edadPaciente != null ? `${base}, ${s.edadPaciente} años` : base;
  }
  return s.edadPaciente != null ? `${nombre}, ${s.edadPaciente} años` : nombre || 'Paciente';
}

export function motivoOnly(s: ServicePartyFields) {
  return parseMotivoAndPaciente(s.description).motivo;
}
