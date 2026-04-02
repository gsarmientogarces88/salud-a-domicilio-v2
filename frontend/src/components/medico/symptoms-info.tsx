'use client';

const SYMPTOMS = [
  { emoji: '🔥', label: 'Fiebre' },
  { emoji: '🤧', label: 'Resfrío / Gripe' },
  { emoji: '🫁', label: 'Problemas respiratorios' },
  { emoji: '🤕', label: 'Dolor de cabeza' },
  { emoji: '🤢', label: 'Náuseas / vómitos' },
  { emoji: '💩', label: 'Diarrea' },
  { emoji: '🤒', label: 'Dolor abdominal' },
  { emoji: '🧒', label: 'Atención infantil' },
  { emoji: '👴', label: 'Atención tercera edad' },
  { emoji: '➕', label: 'Otros síntomas (etc.)' },
];

export default function SymptomsInfo() {
  return (
    <section className="mb-8">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Síntomas que atendemos</h3>
      <p className="mb-4 text-gray-600">
        Nuestros médicos pueden atender en tu domicilio síntomas comunes y urgencias leves.
      </p>
      <div className="flex flex-wrap gap-3">
        {SYMPTOMS.map(({ emoji, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800"
          >
            <span className="text-base">{emoji}</span>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
