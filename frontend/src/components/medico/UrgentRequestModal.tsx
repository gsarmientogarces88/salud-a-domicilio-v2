'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { buildChileGeocodeQuery, geocodeChileAddressLine } from '@/lib/mapboxGeocode';
import LocationSelector from '@/components/ui/LocationSelector';
import MapaDireccion from '@/components/MapaDireccion';

interface UrgentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UrgentRequestModal({ isOpen, onClose }: UrgentRequestModalProps) {
  const router = useRouter();
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino' | 'Otro' | ''>('');
  const [motivo, setMotivo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tieneFiebre, setTieneFiebre] = useState<'Sí' | 'No' | ''>('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [commune, setCommune] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencias, setReferencias] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeState, setGeocodeState] = useState<{ loading: boolean; error?: string | null }>({
    loading: false,
    error: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openServiceInfo, setOpenServiceInfo] = useState<
    | null
    | { id: string; status: 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'ACCEPTED'; doctorName?: string | null }
  >(null);
  const [loading, setLoading] = useState(false);

  const norm = (v: string) => v.replace(/\s+/g, ' ').trim();

  const direccionExacta = norm(direccion);
  const comuna = norm(commune);
  const provinciaNorm = norm(province);
  const regionNorm = norm(region);

  const fullAddress = buildChileGeocodeQuery({
    streetLine: direccionExacta,
    commune: comuna,
    province: provinciaNorm,
    region: regionNorm,
  });

  const handleSearchLocation = async () => {
    // Validaciones antes de buscar
    const e: Record<string, string> = {};
    if (!regionNorm) e.region = 'Región requerida';
    if (!comuna) e.commune = 'Comuna requerida';
    if (!provinciaNorm) e.province = 'Provincia requerida';
    if (!direccionExacta) e.direccion = 'Dirección requerida';

    if (Object.keys(e).length > 0) {
      setErrors((prev) => ({ ...prev, ...e }));
      setGeocodeState({
        loading: false,
        error: 'Completa región, provincia, comuna y dirección exacta para buscar.',
      });
      return;
    }

    setGeocodeState({ loading: true, error: null });
    const result = await geocodeChileAddressLine(fullAddress);
    if (!result.ok) {
      setCoords(null);
      setGeocodeState({ loading: false, error: result.error });
      return;
    }
    setCoords({ lat: result.lat, lng: result.lng });
    setGeocodeState({ loading: false, error: null });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!edad.trim()) e.edad = 'Edad requerida';
    else if (parseInt(edad, 10) < 1 || parseInt(edad, 10) > 120) e.edad = 'Edad inválida (1-120)';
    if (!sexo) e.sexo = 'Sexo requerido';
    if (!motivo.trim()) e.motivo = 'Motivo de consulta requerido';
    if (!telefono.trim()) e.telefono = 'Teléfono requerido';
    if (!region.trim()) e.region = 'Región requerida';
    if (!province.trim()) e.province = 'Provincia requerida';
    if (!commune.trim()) e.commune = 'Comuna requerida';
    if (!direccion.trim()) e.direccion = 'Dirección requerida';
    if (!coords) e.coords = 'Confirma tu ubicación en el mapa para continuar';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setLoading(true);
    setOpenServiceInfo(null);
    try {
      const payload = {
        type: 'URGENT',
        description: motivo.trim(),
        address: direccion.trim(),
        commune: commune.trim(),
        province: province.trim(),
        city: province.trim(),
        region: region.trim(),
        referencias: referencias.trim() || undefined,
        sexo: sexo,
        telefono: telefono.trim(),
        edadPaciente: parseInt(edad, 10),
        tieneFiebre: tieneFiebre === '' ? undefined : tieneFiebre === 'Sí',
      };

      // Logs temporales de creación (paciente)
      // eslint-disable-next-line no-console
      console.log('[patient.createRequest] payload:', payload);

      const created = await apiFetch<{ data: { id: string; status?: string; type?: string; requestLat?: number | null; requestLng?: number | null } }>('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line no-console
      console.log('[patient.createRequest] response:', created);

      await apiFetch(`/services/${created.data.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          lat: coords!.lat,
          lng: coords!.lng,
          source: 'PATIENT_MAP_PIN',
          precision: 'UNKNOWN',
        }),
      });

      // eslint-disable-next-line no-console
      console.log('[patient.confirmLocation] requestId:', created.data.id, 'coords:', coords);
      onClose();
      router.push(`/dashboard/patient/medico/urgente/estado?id=${encodeURIComponent(created.data.id)}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && err.body?.data?.openService) {
        const os = err.body.data.openService as { id: string; status: string; doctorName?: string | null };
        setOpenServiceInfo({
          id: os.id,
          status: os.status as any,
          doctorName: os.doctorName ?? null,
        });
        setErrors({ submit: err.message });
      } else {
        setErrors({ submit: err.message || 'Error al crear la solicitud' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">Solicitud Urgente</h3>
        <p className="mb-6 text-sm text-gray-600">
          Completa los datos para que un médico llegue lo antes posible.
        </p>

        <div className="space-y-6">
          {/* Datos del paciente */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Datos del paciente</h4>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Edad del paciente *</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="Ej: 35"
                  className={`w-full rounded-lg border px-4 py-2 ${
                    errors.edad ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.edad && <p className="mt-1 text-xs text-red-600">{errors.edad}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sexo *</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value as typeof sexo)}
                  className={`w-full rounded-lg border px-4 py-2 ${
                    errors.sexo ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.sexo && <p className="mt-1 text-xs text-red-600">{errors.sexo}</p>}
              </div>
            </div>
          </section>

          {/* Información básica */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Información básica</h4>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Motivo de consulta *</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describa brevemente los síntomas..."
                  rows={3}
                  className={`w-full rounded-lg border px-4 py-2 ${
                    errors.motivo ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.motivo && <p className="mt-1 text-xs text-red-600">{errors.motivo}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono de contacto *</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +56 9 1234 5678"
                  className={`w-full rounded-lg border px-4 py-2 ${
                    errors.telefono ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">¿Tiene fiebre?</label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fiebre"
                      checked={tieneFiebre === 'Sí'}
                      onChange={() => setTieneFiebre('Sí')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="fiebre"
                      checked={tieneFiebre === 'No'}
                      onChange={() => setTieneFiebre('No')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Ubicación */}
          <section>
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Ubicación</h4>
            <div className="space-y-4">
              <LocationSelector
                region={region}
                province={province}
                commune={commune}
                onRegionChange={setRegion}
                onProvinceChange={setProvince}
                onCommuneChange={setCommune}
                labelClassName="mb-1 block text-sm font-medium text-gray-700"
                selectClassName={`w-full rounded-lg border px-4 py-2 ${'border-gray-300'}`}
                errors={{
                  region: errors.region,
                  province: errors.province,
                  commune: errors.commune,
                }}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Dirección exacta *</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Gral. Las Heras 2156, San Miguel"
                  className={`w-full rounded-lg border px-4 py-2 ${
                    errors.direccion ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.direccion && <p className="mt-1 text-xs text-red-600">{errors.direccion}</p>}
              </div>

              <MapaDireccion
                position={coords}
                debug={{
                  direccionExacta,
                  comuna,
                  provincia: provinciaNorm,
                  region: regionNorm,
                }}
                onChangeCoords={(c) => {
                  setCoords(c);
                  if (c) {
                    setErrors((prev) => {
                      const { coords: _coords, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
              {errors.coords && <p className="text-xs text-red-600">{errors.coords}</p>}
              {geocodeState.error && !errors.coords && (
                <p className="text-xs text-amber-700">{geocodeState.error}</p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Referencias (opcional)</label>
                <input
                  type="text"
                  value={referencias}
                  onChange={(e) => setReferencias(e.target.value)}
                  placeholder="Ej: Edificio blanco, 3er piso, depto 301"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>
            </div>
          </section>
        </div>

        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Si presenta dolor torácico intenso, pérdida de conciencia o dificultad respiratoria severa, contacte servicios de emergencia.
        </p>

        {errors.submit && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{errors.submit}</p>
            {openServiceInfo && (
              <div className="mt-2 text-sm text-amber-900/90">
                {openServiceInfo.status === 'IN_PROGRESS' ? (
                  <p>
                    Tu atención está en curso
                    {openServiceInfo.doctorName ? ` con el Dr. ${openServiceInfo.doctorName}` : ''}.
                  </p>
                ) : openServiceInfo.status === 'QUEUED' ? (
                  <p>El médico aceptó tu solicitud, pero está terminando otra atención.</p>
                ) : (
                  <p>Tu solicitud está esperando que un médico la acepte.</p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/patient/medico/urgente/estado?id=${encodeURIComponent(openServiceInfo.id)}`
                    )
                  }
                  className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100/50"
                >
                  Ver atención actual
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading || geocodeState.loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSearchLocation}
            disabled={geocodeState.loading}
            className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:opacity-70"
          >
            {geocodeState.loading ? 'Buscando ubicación...' : coords ? 'Ubicación encontrada' : 'Buscar ubicación'}
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={handleConfirm}
            disabled={loading || geocodeState.loading || !coords}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-70"
          >
            {loading ? 'Enviando...' : 'Confirmar solicitud urgente'}
          </button>
          {!coords && (
            <p className="mt-2 text-xs text-gray-500">
              Primero busca y confirma la ubicación para continuar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
