'use client';

import { useEffect, useRef, useState } from 'react';
import { SectionCard } from '@/components/medicilio/MedicilioUI';

/* ── Tipos ── */
type TipoEjercicio = 'cardio' | 'fuerza_general' | 'fuerza_compuesta';

interface Config {
  pesoInicial: number;
  pesoMeta: number;
  usaOzempic: boolean;
  dosisOzempic: number;
  minutosEjercicio: number;
  tipoEjercicio: TipoEjercicio;
  planNutricional: boolean;
  caloriasObjetivo: number;
  proteinaDiaria: number;
}

declare global {
  interface Window {
    Chart?: any;
  }
}

/* ── Lógica de cálculo ── */
function calcularTasaMensual(config: Config) {
  let tasa = 0.2;

  if (config.usaOzempic) {
    if (config.dosisOzempic === 0.5) tasa += 0.4;
    if (config.dosisOzempic === 1) tasa += 0.6;
    if (config.dosisOzempic === 2) tasa += 0.9;
  }

  const mins = config.minutosEjercicio;
  if (config.tipoEjercicio === 'cardio') tasa += (mins / 150) * 0.6;
  else if (config.tipoEjercicio === 'fuerza_general') tasa += (mins / 150) * 0.45;
  else if (config.tipoEjercicio === 'fuerza_compuesta') tasa += (mins / 150) * 0.8;

  if (config.planNutricional) {
    const tdeeEstimado = config.pesoInicial * 26;
    const deficit = tdeeEstimado - config.caloriasObjetivo;
    tasa += Math.min(Math.max(deficit / 1000, 0), 1.2);
    const proteinaPorKg = config.proteinaDiaria / config.pesoInicial;
    if (proteinaPorKg >= 1.6) tasa += 0.2;
    if (proteinaPorKg >= 2.0) tasa += 0.1;
  }

  return tasa;
}

function calcularCurva(config: Config, mesesMax = 24) {
  const tasa = calcularTasaMensual(config);
  const pesos = [config.pesoInicial];

  for (let m = 1; m <= mesesMax; m++) {
    let factor: number;
    if (m <= 2) factor = 0.65;
    else if (m <= 6) factor = 1.0;
    else if (m <= 12) factor = 0.8;
    else factor = 0.65;

    const pesoAnterior = pesos[m - 1];
    const nuevoPeso = Math.max(config.pesoMeta - 0.5, pesoAnterior - tasa * factor);
    pesos.push(parseFloat(nuevoPeso.toFixed(1)));
    if (nuevoPeso <= config.pesoMeta) break;
  }

  return pesos;
}

function mesMeta(curva: number[], pesoMeta: number) {
  const idx = curva.findIndex((p) => p <= pesoMeta);
  return idx === -1 ? null : idx;
}

function padCurva(curva: number[], length: number) {
  const out = curva.slice();
  const last = out[out.length - 1];
  while (out.length < length) out.push(last);
  return out;
}

function formatearMeses(mes: number | null) {
  if (mes === null) return '>24 m';
  return `~${mes} m`;
}

const COLORS = {
  gray: '#888780',
  amber: '#eda100',
  blue: '#2a78d6',
  red: '#e24b4a',
};

export default function ProyeccionPeso({
  pesoInicialDefault = 90,
  pesoMetaDefault = 75,
}: {
  pesoInicialDefault?: number;
  pesoMetaDefault?: number;
}) {
  const [pesoActual, setPesoActual] = useState(pesoInicialDefault);
  const [pesoMeta, setPesoMeta] = useState(pesoMetaDefault);
  const [usaOzempic, setUsaOzempic] = useState(true);
  const [dosisOzempic, setDosisOzempic] = useState(1);
  const [minutosEjercicio, setMinutosEjercicio] = useState(150);
  const [tipoEjercicio, setTipoEjercicio] = useState<TipoEjercicio>('fuerza_compuesta');
  const [planNutricional, setPlanNutricional] = useState(false);
  const [caloriasObjetivo, setCaloriasObjetivo] = useState(1600);
  const [proteinaDiaria, setProteinaDiaria] = useState(160);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const animateRef = useRef(false);
  const [chartLoaded, setChartLoaded] = useState(false);

  const metaInvalida = pesoMeta >= pesoActual;
  const proteinaPorKg = (proteinaDiaria / Math.max(pesoActual, 1)).toFixed(1);

  // Cargar Chart.js desde CDN una sola vez
  useEffect(() => {
    if (window.Chart) {
      setChartLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.async = true;
    script.onload = () => setChartLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Crear / actualizar gráfico cuando cambian los inputs
  useEffect(() => {
    if (!chartLoaded || !window.Chart || !canvasRef.current || metaInvalida) return;

    const config: Config = {
      pesoInicial: pesoActual,
      pesoMeta,
      usaOzempic,
      dosisOzempic,
      minutosEjercicio,
      tipoEjercicio,
      planNutricional,
      caloriasObjetivo,
      proteinaDiaria,
    };

    const base = { ...config };
    const medio = {
      ...config,
      planNutricional: true,
      caloriasObjetivo: 1700,
      proteinaDiaria: 140,
    };
    const optimo = {
      ...config,
      planNutricional: true,
      caloriasObjetivo: 1600,
      proteinaDiaria: 170,
      tipoEjercicio: 'fuerza_compuesta' as TipoEjercicio,
      minutosEjercicio: Math.max(config.minutosEjercicio, 150),
    };

    const curvaBase = calcularCurva(base, 24);
    const curvaMedio = calcularCurva(medio, 24);
    const curvaOptimo = calcularCurva(optimo, 24);

    const mBase = mesMeta(curvaBase, pesoMeta);
    const mMedio = mesMeta(curvaMedio, pesoMeta);
    const mOptimo = mesMeta(curvaOptimo, pesoMeta);

    const mesLlegadaBase = mBase !== null ? mBase : 24;
    let mesesEje = Math.min(Math.max(mesLlegadaBase + 2, 18), 24);
    const labels = ['Inicio', ...Array.from({ length: mesesEje }, (_, i) => `M${i + 1}`)];
    const len = mesesEje + 1;

    const dataBase = padCurva(curvaBase, len).slice(0, len);
    const dataMedio = padCurva(curvaMedio, len).slice(0, len);
    const dataOptimo = padCurva(curvaOptimo, len).slice(0, len);
    const dataMeta = Array(len).fill(pesoMeta);

    // Plugin: punto destacado cuando óptimo alcanza la meta
    const puntoMetaPlugin = {
      id: 'puntoMeta',
      afterDatasetsDraw(chart: any) {
        const idx = chart._mesOptimoIdx;
        if (idx == null || idx < 0) return;
        const meta = chart.getDatasetMeta(2);
        if (!meta?.data[idx]) return;
        const pt = meta.data[idx];
        const ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.blue;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
      },
    };

    if (!chartRef.current) {
      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Escenario base',
              data: dataBase,
              borderColor: COLORS.gray,
              backgroundColor: COLORS.gray,
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3,
            },
            {
              label: 'Escenario medio',
              data: dataMedio,
              borderColor: COLORS.amber,
              backgroundColor: COLORS.amber,
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3,
            },
            {
              label: 'Escenario óptimo',
              data: dataOptimo,
              borderColor: COLORS.blue,
              backgroundColor: COLORS.blue,
              borderWidth: 2.5,
              pointRadius: 3,
              tension: 0.3,
            },
            {
              label: 'Meta',
              data: dataMeta,
              borderColor: COLORS.red,
              borderWidth: 1.5,
              borderDash: [6, 4],
              pointRadius: 0,
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#0b0b0b',
              bodyColor: '#0b0b0b',
              borderColor: 'rgba(0,0,0,0.08)',
              borderWidth: 1,
              padding: 12,
              filter: (item: any) => item.datasetIndex !== 3,
              callbacks: {
                title: (items: any[]) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  return idx === 0 ? 'Inicio' : `Mes ${idx}`;
                },
                label: (ctx: any) =>
                  `  ${ctx.dataset.label}:  ${ctx.parsed.y.toFixed(1)} kg`,
                afterBody: () => ['─────────────────', `Meta: ${pesoMeta.toFixed(1)} kg`],
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: { font: { size: 11 }, color: '#6b6b68' },
            },
            y: {
              min: pesoMeta - 3,
              max: pesoActual + 1,
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: {
                font: { size: 11 },
                color: '#6b6b68',
                callback: (v: number) => `${v} kg`,
              },
            },
          },
        },
        plugins: [puntoMetaPlugin],
      });
      chartRef.current._mesOptimoIdx = mOptimo;
      chartRef.current._metricas = { mBase, mMedio, mOptimo };
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = dataBase;
      chart.data.datasets[1].data = dataMedio;
      chart.data.datasets[2].data = dataOptimo;
      chart.data.datasets[3].data = dataMeta;
      chart.options.scales.y.min = pesoMeta - 3;
      chart.options.scales.y.max = pesoActual + 1;
      chart._mesOptimoIdx = mOptimo;
      chart._metricas = { mBase, mMedio, mOptimo };
      if (animateRef.current) {
        chart.options.animation = { duration: 400 };
        chart.update();
      } else {
        chart.update('none');
      }
      animateRef.current = false;
    }
  }, [
    pesoActual,
    pesoMeta,
    usaOzempic,
    dosisOzempic,
    minutosEjercicio,
    tipoEjercicio,
    planNutricional,
    caloriasObjetivo,
    proteinaDiaria,
    metaInvalida,
    chartLoaded,
  ]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  // Métricas derivadas (mismas curvas que el effect)
  const metricas = (() => {
    if (metaInvalida) return { mBase: null, mMedio: null, mOptimo: null };
    const config: Config = {
      pesoInicial: pesoActual,
      pesoMeta,
      usaOzempic,
      dosisOzempic,
      minutosEjercicio,
      tipoEjercicio,
      planNutricional,
      caloriasObjetivo,
      proteinaDiaria,
    };
    const base = calcularCurva(config, 24);
    const medio = calcularCurva(
      { ...config, planNutricional: true, caloriasObjetivo: 1700, proteinaDiaria: 140 },
      24
    );
    const optimo = calcularCurva(
      {
        ...config,
        planNutricional: true,
        caloriasObjetivo: 1600,
        proteinaDiaria: 170,
        tipoEjercicio: 'fuerza_compuesta',
        minutosEjercicio: Math.max(minutosEjercicio, 150),
      },
      24
    );
    return {
      mBase: mesMeta(base, pesoMeta),
      mMedio: mesMeta(medio, pesoMeta),
      mOptimo: mesMeta(optimo, pesoMeta),
    };
  })();

  // Textos informativos
  const infoOzempic = (() => {
    if (!usaOzempic)
      return { title: 'Ozempic', text: 'Sin medicación. La proyección se basa solo en ejercicio y nutrición.', active: false };
    const pct: Record<number, string> = { 0.5: '≈15–20%', 1: '≈25–30%', 2: '≈35–40%' };
    return {
      title: `Ozempic ${dosisOzempic} mg`,
      text: `Reducción estimada del apetito: ${pct[dosisOzempic] || '—'}. Favorece menor ingesta calórica espontánea.`,
      active: true,
    };
  })();

  const kcalMin: Record<TipoEjercicio, number> = {
    cardio: 7,
    fuerza_general: 5.5,
    fuerza_compuesta: 8,
  };
  const nombresTipo: Record<TipoEjercicio, string> = {
    cardio: 'cardio moderado',
    fuerza_general: 'fuerza general',
    fuerza_compuesta: 'fuerza compuesta',
  };
  const kcalSemana = Math.round(minutosEjercicio * kcalMin[tipoEjercicio]);
  const infoEjercicio = `Con ${minutosEjercicio} min/sem de ${nombresTipo[tipoEjercicio]} se estiman ~${kcalSemana} kcal quemadas por semana.`;

  const infoNutricion = (() => {
    if (!planNutricional)
      return { text: 'Sin plan nutricional activo. Actívalo para ver el déficit estimado.', active: false };
    const tdee = Math.round(pesoActual * 26);
    const deficit = tdee - caloriasObjetivo;
    return {
      text: `Déficit estimado: ~${deficit} kcal/día (TDEE ~${tdee} − ${caloriasObjetivo}). Proteína: ${proteinaPorKg} g/kg.`,
      active: true,
    };
  })();

  const animar = () => {
    animateRef.current = true;
  };

  return (
    <section id="proyeccion-peso" className="space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-texto-4)]">
          Simulador interactivo
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--color-texto-1)]">
          Proyección de pérdida de peso
        </h2>
        <p className="mt-1 text-sm text-[var(--color-texto-3)]">
          Ajusta tus hábitos y ve en tiempo real cómo cambia tu proyección con Ozempic u opciones similares.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── Panel inputs ── */}
        <SectionCard className="space-y-5 p-5">
          {/* Datos */}
          <div>
            <p className="mb-3 border-b border-[var(--color-borde-card)] pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-texto-4)]">
              Datos del paciente
            </p>
            <label className="mb-3 block text-sm font-medium text-[var(--color-texto-2)]">
              <span className="mb-1 flex justify-between">
                <span>Peso actual</span>
                <span className="font-semibold text-[var(--color-azul-primario)]">{pesoActual} kg</span>
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={60}
                  max={200}
                  step={0.5}
                  value={pesoActual}
                  onChange={(e) => setPesoActual(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-[var(--color-azul-primario)]"
                />
                <input
                  type="number"
                  min={60}
                  max={200}
                  step={0.5}
                  value={pesoActual}
                  onChange={(e) => setPesoActual(Number(e.target.value))}
                  className="h-8 w-16 rounded-md border border-[var(--color-borde-card)] bg-[#F8FAFB] px-1 text-center text-sm outline-none focus:border-[var(--color-azul-primario)]"
                />
              </div>
            </label>
            <label className="block text-sm font-medium text-[var(--color-texto-2)]">
              <span className="mb-1 flex justify-between">
                <span>Peso meta</span>
                <span className="font-semibold text-[var(--color-azul-primario)]">{pesoMeta} kg</span>
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={50}
                  max={180}
                  step={0.5}
                  value={pesoMeta}
                  onChange={(e) => setPesoMeta(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-[var(--color-azul-primario)]"
                />
                <input
                  type="number"
                  min={50}
                  max={180}
                  step={0.5}
                  value={pesoMeta}
                  onChange={(e) => setPesoMeta(Number(e.target.value))}
                  className="h-8 w-16 rounded-md border border-[var(--color-borde-card)] bg-[#F8FAFB] px-1 text-center text-sm outline-none focus:border-[var(--color-azul-primario)]"
                />
              </div>
              {metaInvalida && (
                <p className="mt-1.5 text-xs text-[#E24B4A]">
                  El peso meta debe ser menor que el peso actual.
                </p>
              )}
            </label>
          </div>

          {/* Medicación */}
          <div>
            <p className="mb-3 border-b border-[var(--color-borde-card)] pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-texto-4)]">
              Medicación
            </p>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-texto-2)]">
                Tratamiento Farmacológico
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={usaOzempic}
                onClick={() => {
                  animar();
                  setUsaOzempic((v) => !v);
                }}
                className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
                  usaOzempic ? 'bg-[var(--color-azul-primario)]' : 'bg-[#ccc]'
                }`}
              >
                <span
                  className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                    usaOzempic ? 'left-[20px]' : 'left-[2px]'
                  }`}
                />
              </button>
            </div>
            {usaOzempic && (
              <div className="space-y-2">
                {[
                  [0.5, '0.5 mg/semana'],
                  [1, '1 mg/semana'],
                  [2, '2 mg/semana'],
                ].map(([val, label]) => (
                  <label key={String(val)} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-texto-3)]">
                    <input
                      type="radio"
                      name="dosis-ozempic"
                      checked={dosisOzempic === val}
                      onChange={() => {
                        animar();
                        setDosisOzempic(val as number);
                      }}
                      className="accent-[var(--color-azul-primario)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Ejercicio */}
          <div>
            <p className="mb-3 border-b border-[var(--color-borde-card)] pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-texto-4)]">
              Ejercicio
            </p>
            <label className="mb-3 block text-sm font-medium text-[var(--color-texto-2)]">
              <span className="mb-1 flex justify-between">
                <span>Minutos / semana</span>
                <span className="font-semibold text-[var(--color-azul-primario)]">{minutosEjercicio} min</span>
              </span>
              <input
                type="range"
                min={0}
                max={420}
                step={30}
                value={minutosEjercicio}
                onChange={(e) => setMinutosEjercicio(Number(e.target.value))}
                className="mt-1 h-1 w-full cursor-pointer accent-[var(--color-azul-primario)]"
              />
            </label>
            <p className="mb-2 text-sm font-medium text-[var(--color-texto-2)]">Tipo de ejercicio</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['cardio', 'Cardio moderado'],
                  ['fuerza_general', 'Fuerza general'],
                  ['fuerza_compuesta', 'Fuerza compuesta'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    animar();
                    setTipoEjercicio(val);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    tipoEjercicio === val
                      ? 'border-[var(--color-azul-primario)] bg-[var(--color-azul-primario)] text-white'
                      : 'border-[var(--color-borde-card)] bg-white text-[var(--color-texto-3)] hover:border-[var(--color-azul-primario)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrición */}
          <div>
            <p className="mb-3 border-b border-[var(--color-borde-card)] pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-texto-4)]">
              Nutrición
            </p>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-texto-2)]">
                ¿Sigue plan nutricional?
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={planNutricional}
                onClick={() => {
                  animar();
                  setPlanNutricional((v) => !v);
                }}
                className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
                  planNutricional ? 'bg-[var(--color-azul-primario)]' : 'bg-[#ccc]'
                }`}
              >
                <span
                  className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                    planNutricional ? 'left-[20px]' : 'left-[2px]'
                  }`}
                />
              </button>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                planNutricional ? 'max-h-[280px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <label className="mb-3 block text-sm font-medium text-[var(--color-texto-2)]">
                <span className="mb-1 flex justify-between">
                  <span>Calorías diarias</span>
                  <span className="font-semibold text-[var(--color-azul-primario)]">{caloriasObjetivo} kcal</span>
                </span>
                <input
                  type="range"
                  min={1000}
                  max={2800}
                  step={50}
                  value={caloriasObjetivo}
                  onChange={(e) => setCaloriasObjetivo(Number(e.target.value))}
                  className="mt-1 h-1 w-full cursor-pointer accent-[var(--color-azul-primario)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--color-texto-2)]">
                <span className="mb-1 flex justify-between">
                  <span>Proteína diaria</span>
                  <span className="font-semibold text-[var(--color-azul-primario)]">{proteinaDiaria} g</span>
                </span>
                <input
                  type="range"
                  min={60}
                  max={250}
                  step={5}
                  value={proteinaDiaria}
                  onChange={(e) => setProteinaDiaria(Number(e.target.value))}
                  className="mt-1 h-1 w-full cursor-pointer accent-[var(--color-azul-primario)]"
                />
                <p className="mt-1 text-[11px] text-[var(--color-texto-4)]">
                  {proteinaPorKg} g/kg de peso actual
                </p>
              </label>
            </div>
          </div>
        </SectionCard>

        {/* ── Panel outputs ── */}
        <div className={`space-y-4 transition-opacity ${metaInvalida ? 'pointer-events-none opacity-40' : ''}`}>
          {/* Tarjetas métricas */}
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['Escenario base', metricas.mBase, COLORS.gray, 'Con tus hábitos e inputs actuales'],
                ['Escenario medio', metricas.mMedio, COLORS.amber, 'Base + dieta hipocalórica básica'],
                ['Escenario óptimo', metricas.mOptimo, COLORS.blue, 'Dieta completa + fuerza compuesta máxima'],
              ] as const
            ).map(([label, mes, color, desc]) => (
              <div
                key={label}
                className="rounded-[16px] border border-[var(--color-borde-card)] border-t-[3px] bg-white p-4"
                style={{ borderTopColor: color }}
              >
                <p className="text-[11px] font-medium text-[var(--color-texto-4)]">{label}</p>
                <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight" style={{ color }}>
                  {formatearMeses(mes)}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-[var(--color-texto-3)]">{desc}</p>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <SectionCard className="p-5">
            <div className="mb-3 flex flex-wrap gap-4">
              {(
                [
                  [COLORS.gray, 'Escenario base'],
                  [COLORS.amber, 'Escenario medio'],
                  [COLORS.blue, 'Escenario óptimo'],
                  [COLORS.red, 'Peso meta'],
                ] as const
              ).map(([color, name]) => (
                <span key={name} className="inline-flex items-center gap-1.5 text-xs text-[var(--color-texto-3)]">
                  <span className="inline-block h-[10px] w-[10px] rounded-sm" style={{ background: color }} />
                  {name}
                </span>
              ))}
            </div>
            <div className="relative h-[320px] w-full">
              <canvas ref={canvasRef} />
            </div>
          </SectionCard>

          {/* Info inferior */}
          <div className="grid gap-3 sm:grid-cols-3">
            <SectionCard className={`p-4 ${!infoOzempic.active ? 'opacity-60' : ''}`}>
              <h3 className="text-xs font-semibold text-[var(--color-texto-1)]">{infoOzempic.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--color-texto-3)]">{infoOzempic.text}</p>
            </SectionCard>
            <SectionCard className="p-4">
              <h3 className="text-xs font-semibold text-[var(--color-texto-1)]">Ejercicio</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--color-texto-3)]">{infoEjercicio}</p>
            </SectionCard>
            <SectionCard className={`p-4 ${!infoNutricion.active ? 'opacity-60' : ''}`}>
              <h3 className="text-xs font-semibold text-[var(--color-texto-1)]">Nutrición</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--color-texto-3)]">{infoNutricion.text}</p>
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
}
