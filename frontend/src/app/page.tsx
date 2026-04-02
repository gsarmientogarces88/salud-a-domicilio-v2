const SERVICES = [
  {
    icon: '👨‍⚕️',
    title: 'Médico a domicilio',
    description: 'Consulta médica en tu hogar',
  },
  {
    icon: '💉',
    title: 'Enfermería',
    description: 'Atención de enfermería',
  },
  {
    icon: '🧪',
    title: 'Exámenes a domicilio',
    description: 'Análisis y toma de muestras',
  },
  {
    icon: '🩺',
    title: 'Telemedicina',
    description: 'Consultas online',
  },
];

const SYMPTOMS = [
  '🔥 Fiebre',
  '🤧 Resfrío / Gripe',
  '🫁 Problemas respiratorios',
  '🤕 Dolor de cabeza',
  '🤢 Náuseas / vómitos',
  '💩 Diarrea',
  '🤒 Dolor abdominal',
  '🧒 Atención infantil',
  '👴 Atención tercera edad',
  '➕ Otros síntomas',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-salud-light via-white to-white">
      {/* Contenedor principal */}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-2xl">
              🏥
            </div>
            <span className="text-base font-semibold text-sky-800">
              Salud a Domicilio
            </span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a href="/auth/login" className="rounded-full px-3 py-1 text-gray-700 hover:bg-sky-50">
              Iniciar Sesión
            </a>
            <a
              href="/auth/register"
              className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 font-medium text-sky-700 hover:bg-sky-100"
            >
              Registrarse
            </a>
          </nav>
        </header>

        {/* HERO */}
        <section className="mb-12 grid gap-10 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100 backdrop-blur md:grid-cols-2 md:p-10">
          {/* Columna izquierda */}
          <div className="flex flex-col justify-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Plataforma de médicos a domicilio en Chile
            </div>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              Médicos a Domicilio en todo Chile
            </h1>
            <p className="mb-6 max-w-xl text-sm text-gray-600 sm:text-base">
              Atención médica rápida, profesional y segura desde la comodidad de tu hogar.
              Agenda una visita domiciliaria o consulta online con médicos certificados.
            </p>

            <div className="mb-5 flex flex-wrap gap-3">
              <a
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
              >
                Agendar Atención
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-md ring-1 ring-sky-100 hover:bg-sky-50"
              >
                <span className="text-lg">🟢</span>
                <span>Dudas por WhatsApp</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 sm:text-sm">
              Cobertura inicial en principales ciudades de Chile. Expandiéndonos progresivamente a más comunas.
            </p>
          </div>

          {/* Columna derecha: imagen/hero */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-sky-200/70 via-sky-100/60 to-emerald-100/70" />
            <div className="relative h-64 overflow-hidden rounded-3xl bg-cover bg-center shadow-lg sm:h-72 md:h-full"
              style={{
                backgroundImage:
                  'url(https://images.pexels.com/photos/6129681/pexels-photo-6129681.jpeg?auto=compress&cs=tinysrgb&w=1200)',
              }}
            >
              <div className="absolute inset-0 bg-white/35 backdrop-blur-sm" />
            </div>
          </div>
        </section>

        {/* SERVICIOS */}
        <section className="mb-12">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Servicios</h2>
          <p className="mb-6 text-sm text-gray-600">
            Soluciones integrales de atención domiciliaria y telemedicina para ti y tu familia.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-md shadow-sky-100 ring-1 ring-sky-50"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-2xl">
                  {service.icon}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-gray-900 sm:text-base">
                  {service.title}
                </h3>
                <p className="text-xs text-gray-600 sm:text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SÍNTOMAS */}
        <section className="mb-4 rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-sky-50">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Síntomas que atendemos
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Nuestros médicos pueden atender en tu domicilio síntomas comunes y urgencias leves.
          </p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((symptom) => (
              <span
                key={symptom}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 sm:text-sm"
              >
                {symptom}
              </span>
            ))}
          </div>
        </section>

        {/* Footer simple */}
        <footer className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-sky-100 pt-4 text-xs text-gray-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Salud a Domicilio. Todos los derechos reservados.</span>
          <span>Plataforma de salud digital desarrollada en Chile.</span>
        </footer>
      </div>
    </main>
  );
}
