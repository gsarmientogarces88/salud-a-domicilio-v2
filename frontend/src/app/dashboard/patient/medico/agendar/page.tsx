'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ScheduleModal from '@/components/medico/ScheduleModal';
import type { DoctorCard } from '@/components/medico/DoctorList';
import MapaDireccion from '@/components/MapaDireccion';
import { apiFetch } from '@/lib/api';
import { geocodeChileAddressLine, reverseGeocodeChile } from '@/lib/mapboxGeocode';
import {
  FloatingAction,
  InitialAvatar,
  RatingStars,
  SectionCard,
  SvgIcon,
} from '@/components/medicilio/MedicilioUI';
import { MEDICAL_SPECIALTIES, MEDICAL_SPECIALTY_CARDS } from '@/data/medicalSpecialties';

type AgendaIconName = Parameters<typeof SvgIcon>[0]['name'];
type AvatarTone = NonNullable<Parameters<typeof InitialAvatar>[0]['tone']>;

type RecentRequest = {
  id: string;
  kind: 'URGENT' | 'AGENDA';
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  href: string;
};

type ProfessionalApi = {
  id: string;
  specialty: string;
  baseFee: number;
  region?: string | null;
  province?: string | null;
  commune?: string | null;
  distanceKm?: number | null;
  user: { firstName: string; lastName: string };
};

type ListedDoctor = DoctorCard & {
  initials: string;
  price: string;
  tone: AvatarTone;
  locationLabel: string;
  distanceKm?: number | null;
};

const specialties = MEDICAL_SPECIALTY_CARDS;

const tones: AvatarTone[] = ['blue', 'green', 'purple', 'amber'];

const reasons = [
  ['Profesionales verificados', 'Registro SIS activo', 'shield'],
  ['Atención en domicilio', 'Sin traslado ni filas', 'home'],
  ['Pago seguro Webpay', 'Pago en línea', 'lock'],
  ['Documentación digital', 'Documentos al finalizar', 'file'],
  ['Adultos y niños', 'Pediatría disponible', 'heart'],
] as const;

const MIN_ADDRESS_LENGTH = 8;
const GEOCODE_DEBOUNCE_MS = 700;

function formatStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    QUEUED: 'En cola',
    ACCEPTED: 'Aceptada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    CONFIRMED: 'Confirmada',
    REJECTED: 'Rechazada',
    EXPIRED: 'Expirada',
  };
  return map[status] || status;
}

function initialsFromName(name: string) {
  const parts = name
    .replace(/^Dr\.?\s*/i, '')
    .replace(/^Dra\.?\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function formatLocation(p: ProfessionalApi) {
  return [p.commune, p.province, p.region].filter(Boolean).join(', ') || 'Gran Concepción';
}

function mapProfessional(p: ProfessionalApi, index: number): ListedDoctor {
  const firstName = (p.user?.firstName || '').trim();
  const lastName = (p.user?.lastName || '').trim();
  const name = `Dr. ${[firstName, lastName].filter(Boolean).join(' ')}`.trim();
  const fee = typeof p.baseFee === 'number' ? p.baseFee : 0;
  const distanceLabel =
    typeof p.distanceKm === 'number' ? `A ${p.distanceKm.toFixed(1)} km` : null;
  return {
    id: p.id,
    name,
    specialty: p.specialty || MEDICAL_SPECIALTIES[0],
    initials: initialsFromName(name),
    price: `$${fee.toLocaleString('es-CL')}`,
    tone: tones[index % tones.length],
    locationLabel: distanceLabel || formatLocation(p),
    region: p.region,
    province: p.province,
    commune: p.commune,
    distanceKm: p.distanceKm ?? null,
    availabilityLabel: 'Agenda disponible',
  };
}

export default function AgendarPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(MEDICAL_SPECIALTIES[0]);
  const [modalDoctor, setModalDoctor] = useState<DoctorCard | null>(null);
  const [doctors, setDoctors] = useState<ListedDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [locationHint, setLocationHint] = useState(
    'Detectando tu ubicación… Si el GPS no responde, mueve el pin o escribe tu dirección.',
  );
  const [patientCoords, setPatientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressText, setAddressText] = useState('');
  const [confirmedAddress, setConfirmedAddress] = useState('');
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [doctorsError, setDoctorsError] = useState('');
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const skipNextGeocodeRef = useRef(false);
  const geocodeRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);

  const handleCoordsChange = async (coords: { lat: number; lng: number } | null) => {
    if (!coords) return;
    setPatientCoords(coords);
    setLocationHint('Buscamos médicos a menos de 10 km del pin. Puedes ajustarlo en el mapa.');
    setDoctorsError('');

    const reverseId = ++reverseRequestIdRef.current;
    const result = await reverseGeocodeChile(coords.lat, coords.lng);
    if (reverseId !== reverseRequestIdRef.current) return;

    if (result.ok) {
      skipNextGeocodeRef.current = true;
      setConfirmedAddress(result.placeName);
      setAddressText(result.placeName);
      setGeocodeState({ loading: false, error: null });
    }
  };

  // GPS inicial + dirección automática (igual que Urgencias)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPatientCoords(next);
        setLocationHint('Usamos tu ubicación actual. Ajusta el pin o la dirección si es necesario.');
        setDoctorsError('');

        const reverseId = ++reverseRequestIdRef.current;
        const result = await reverseGeocodeChile(next.lat, next.lng);
        if (reverseId !== reverseRequestIdRef.current) return;

        if (result.ok) {
          skipNextGeocodeRef.current = true;
          setConfirmedAddress(result.placeName);
          setAddressText((prev) => prev || result.placeName);
        }
      },
      () => {
        // El timeout de 4.5s ya orienta a pin/dirección si no hay GPS
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  // Si el GPS no responde (común en HTTP), orientar a pin/dirección
  useEffect(() => {
    if (patientCoords) return;
    const timer = window.setTimeout(() => {
      setLocationHint(
        'No pudimos usar el GPS del navegador. Escribe tu dirección o mueve el pin del mapa.',
      );
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [patientCoords]);

  // Geocodificar dirección → mover pin
  useEffect(() => {
    if (skipNextGeocodeRef.current) {
      skipNextGeocodeRef.current = false;
      return;
    }
    const query = addressText.replace(/\s+/g, ' ').trim();
    if (query.length < MIN_ADDRESS_LENGTH) return;

    const timer = window.setTimeout(async () => {
      const requestId = ++geocodeRequestIdRef.current;
      setGeocodeState({ loading: true, error: null });
      const result = await geocodeChileAddressLine(`${query}, Chile`);
      if (requestId !== geocodeRequestIdRef.current) return;
      if (!result.ok) {
        setGeocodeState({ loading: false, error: result.error });
        return;
      }
      setPatientCoords({ lat: result.lat, lng: result.lng });
      setConfirmedAddress(result.placeName || query);
      setLocationHint('Ubicación según tu dirección. Ajusta el pin si es necesario.');
      setGeocodeState({ loading: false, error: null });
    }, GEOCODE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [addressText]);

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      if (!patientCoords) {
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }
      setLoadingDoctors(true);
      setDoctorsError('');
      try {
        const params = new URLSearchParams();
        params.set('forAgenda', '1');
        params.set('lat', String(patientCoords.lat));
        params.set('lng', String(patientCoords.lng));
        if (selectedSpecialty) {
          params.set('type', selectedSpecialty);
        }
        const res = await apiFetch<{ data: ProfessionalApi[] }>(
          `/professionals?${params.toString()}`,
        );
        if (!cancelled) {
          setDoctors((res.data || []).map(mapProfessional));
        }
      } catch (e: any) {
        if (!cancelled) {
          setDoctors([]);
          setDoctorsError(e?.message || 'No se pudieron cargar médicos cercanos.');
        }
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    };

    void loadDoctors();
    return () => {
      cancelled = true;
    };
  }, [selectedSpecialty, patientCoords]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingRecent(true);
      try {
        const [servicesRes, agendaRes] = await Promise.allSettled([
          apiFetch<{
            data: Array<{
              id: string;
              type?: string;
              description?: string;
              status: string;
              createdAt: string;
              address?: string;
            }>;
          }>('/services/me'),
          apiFetch<{
            data: Array<{
              id: string;
              status: string;
              createdAt: string;
              addressText?: string;
              notes?: string | null;
              professional?: { user?: { firstName?: string; lastName?: string } };
            }>;
          }>('/agenda/requests'),
        ]);

        const items: RecentRequest[] = [];

        if (servicesRes.status === 'fulfilled') {
          for (const s of servicesRes.value.data || []) {
            items.push({
              id: s.id,
              kind: 'URGENT',
              title: s.type === 'SCHEDULED' ? 'Consulta programada' : 'Urgencia a domicilio',
              subtitle: s.description || s.address || 'Sin detalle',
              status: s.status,
              createdAt: s.createdAt,
              href:
                s.type === 'URGENT'
                  ? `/dashboard/patient/medico/urgente/estado?id=${encodeURIComponent(s.id)}`
                  : `/dashboard/patient/historial`,
            });
          }
        }

        if (agendaRes.status === 'fulfilled') {
          for (const a of agendaRes.value.data || []) {
            const docName = a.professional?.user
              ? `${a.professional.user.firstName || ''} ${a.professional.user.lastName || ''}`.trim()
              : '';
            items.push({
              id: a.id,
              kind: 'AGENDA',
              title: docName ? `Agenda · ${docName}` : 'Agenda médica',
              subtitle: a.notes || a.addressText || 'Visita programada',
              status: a.status,
              createdAt: a.createdAt,
              href: `/dashboard/patient/agenda/estado/${a.id}`,
            });
          }
        }

        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!cancelled) setRecent(items.slice(0, 3));
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Especialidades disponibles
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">¿Qué tipo de médico necesitas?</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-texto-3)]">
          Puedes elegir el área que necesitas. Te atenderá un especialista o un médico con formación avanzada en esa
          área.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {specialties.map(({ title, price, eta, icon }) => {
            const selected = selectedSpecialty === title;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedSpecialty(title)}
                className={`rounded-[14px] border p-5 text-center hover:border-[var(--color-azul-borde)] hover:shadow-[0_2px_12px_rgba(24,95,165,0.08)] ${
                  selected
                    ? 'border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)]'
                    : 'border-[var(--color-borde-card)] bg-white'
                }`}
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-[var(--color-azul-primario)]">
                  <SvgIcon name={icon} className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-texto-1)]">{title}</span>
                <span className="mt-1 block text-xs font-medium text-[var(--color-azul-primario)]">{price}</span>
                <span className="mt-1 block text-xs text-[var(--color-texto-3)]">{eta}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="medicos-disponibles">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
              Médicos disponibles
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Profesionales cerca de ti</h2>
          </div>
          <span className="text-sm text-[var(--color-texto-3)]">
            {!patientCoords
              ? 'Indica tu ubicación'
              : loadingDoctors
                ? 'Cargando…'
                : `${doctors.length} profesional${doctors.length === 1 ? '' : 'es'} encontrado${doctors.length === 1 ? '' : 's'} en la zona`}
          </span>
        </div>

        <SectionCard className="mt-5 space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-texto-2)]">
              Tu dirección
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Calle, número, comuna"
              className="w-full rounded-[10px] border border-[var(--color-borde-card)] px-3 py-2 text-sm text-[var(--color-texto-1)]"
            />
          </div>
          {locationHint && (
            <p className="text-[11px] text-[var(--color-azul-primario)]">{locationHint}</p>
          )}
          {geocodeState.loading && (
            <p className="text-[11px] text-[var(--color-texto-3)]">Buscando ubicación…</p>
          )}
          {geocodeState.error && (
            <p className="text-xs text-amber-700">{geocodeState.error}</p>
          )}
          <MapaDireccion
            position={patientCoords}
            onChangeCoords={(c) => {
              void handleCoordsChange(c);
            }}
            label="Confirma tu ubicación en el mapa (radio 10 km)"
            mapClassName="h-56 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm sm:h-72"
          />
          {confirmedAddress ? (
            <div className="rounded-[8px] border border-[var(--color-azul-borde)] bg-[var(--color-azul-claro)] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-texto-3)]">
                Dirección confirmada
              </p>
              <p className="mt-0.5 text-xs font-medium text-[var(--color-texto-1)]">{confirmedAddress}</p>
              {patientCoords && (
                <p className="mt-0.5 text-[10px] text-[var(--color-texto-4)]">
                  {patientCoords.lat.toFixed(5)}, {patientCoords.lng.toFixed(5)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-texto-4)]">
              Escribe tu dirección o mueve el pin para confirmar la ubicación.
            </p>
          )}
          {!patientCoords && (
            <p className="text-xs text-[var(--color-texto-3)]">
              En sitios sin HTTPS el GPS del navegador suele estar bloqueado. Escribe tu dirección o
              mueve el pin para ver médicos cercanos.
            </p>
          )}
        </SectionCard>

        <div className="mt-5 space-y-4">
          {doctorsError && (
            <SectionCard className="border-[var(--color-rojo-borde)] bg-[var(--color-rojo-claro)] p-4 text-sm text-[var(--color-rojo-urgencia)]">
              {doctorsError}
            </SectionCard>
          )}
          {loadingDoctors && patientCoords && (
            <SectionCard className="p-4 text-sm text-[var(--color-texto-3)]">
              Buscando médicos a menos de 10 km…
            </SectionCard>
          )}
          {!loadingDoctors && patientCoords && !doctorsError && doctors.length === 0 && (
            <SectionCard className="p-4 text-sm text-[var(--color-texto-3)]">
              No hay profesionales de {selectedSpecialty} a menos de 10 km de tu ubicación. Prueba otra
              especialidad o ajusta el pin.
            </SectionCard>
          )}
          {!loadingDoctors &&
            doctors.map((doctor, index) => (
              <article
                key={doctor.id}
                className={`rounded-[14px] border bg-white p-5 ${
                  index === 0 ? 'border-2 border-[var(--color-azul-primario)]' : 'border-[var(--color-borde-card)]'
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <InitialAvatar initials={doctor.initials} tone={doctor.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--color-texto-1)]">{doctor.name}</h3>
                      <span className="rounded-full bg-[var(--color-verde-claro)] px-2 py-1 text-[10px] font-medium text-[#27500A]">
                        Agenda disponible
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-texto-3)]">{doctor.specialty}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-texto-3)]">
                      <span className="inline-flex items-center gap-1">
                        <RatingStars />
                      </span>
                      <span>{doctor.locationLabel}</span>
                      <span>Registro SIS activo</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[var(--color-azul-primario)]">{doctor.price}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setModalDoctor({
                        id: doctor.id,
                        name: doctor.name,
                        specialty: doctor.specialty,
                      })
                    }
                    className="rounded-[10px] bg-[var(--color-azul-primario)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C447C]"
                  >
                    Agendar ahora
                  </button>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section className="rounded-[16px] bg-[var(--color-azul-claro)] p-6">
        <h2 className="text-xl font-semibold text-[var(--color-texto-1)]">Todo lo que incluye tu atención</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-3)]">
          Cada reserva incluye protección, información clara y seguimiento.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {reasons.map(([title, text, icon]) => (
            <SectionCard key={title} className="flex gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-azul-claro)] text-[var(--color-azul-primario)]">
                <SvgIcon name={icon as AgendaIconName} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--color-texto-1)]">{title}</span>
                <span className="text-xs text-[var(--color-texto-3)]">{text}</span>
              </span>
            </SectionCard>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">Historial</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Tus últimas 3 solicitudes</h2>
        <div className="mt-4 space-y-3">
          {loadingRecent && (
            <SectionCard className="p-4 text-sm text-[var(--color-texto-3)]">Cargando solicitudes…</SectionCard>
          )}
          {!loadingRecent && recent.length === 0 && (
            <SectionCard className="p-4 text-sm text-[var(--color-texto-3)]">
              Aún no tienes solicitudes. Agenda un médico o solicita una urgencia.
            </SectionCard>
          )}
          {recent.map((item) => (
            <SectionCard key={`${item.kind}-${item.id}`} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-texto-1)]">{item.title}</p>
                    <span className="rounded-full bg-[var(--color-azul-claro)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-azul-primario)]">
                      {item.kind === 'URGENT' ? 'Urgencia' : 'Agenda'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-texto-3)]">{item.subtitle}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-texto-4)]">
                    {new Date(item.createdAt).toLocaleString('es-CL')} · {formatStatus(item.status)}
                  </p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-azul-borde)] px-3 py-2 text-xs font-semibold text-[var(--color-azul-primario)] hover:bg-[var(--color-azul-claro)]"
                >
                  Ver detalle
                </Link>
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Testimonios verificados
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">Lo que dicen quienes ya agendaron</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            'Agendé al Dr. Muñoz en 2 minutos. Llegó puntual y explicó todo con mucha claridad.',
            'La Dra. Pérez tuvo muy buen trato con mi hija. Pude elegir la hora que me acomodaba.',
            'Me sentí segura desde el inicio. Proceso simple y pago protegido.',
          ].map((text, index) => (
            <SectionCard key={text} className="p-5">
              <p className="text-5xl leading-none text-[var(--color-azul-borde)]">“</p>
              <p className="-mt-3 text-sm leading-6 text-[var(--color-texto-2)]">{text}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-texto-3)]">
                  {['María S.', 'Valentina C.', 'Claudia P.'][index]}
                </span>
                <RatingStars />
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      <ScheduleModal
        isOpen={!!modalDoctor}
        onClose={() => setModalDoctor(null)}
        doctor={modalDoctor}
        initialLocation={
          patientCoords
            ? {
                lat: patientCoords.lat,
                lng: patientCoords.lng,
                address: confirmedAddress || addressText || undefined,
              }
            : null
        }
      />
      <FloatingAction href="#medicos-disponibles">Ver médicos disponibles</FloatingAction>
    </div>
  );
}
