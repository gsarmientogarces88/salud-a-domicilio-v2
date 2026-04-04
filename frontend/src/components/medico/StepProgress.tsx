'use client';

const STEPS = [
  { id: 'solicitar', label: 'Solicitar' },
  { id: 'confirmar', label: 'Confirmar' },
  { id: 'camino', label: 'En camino' },
  { id: 'consulta', label: 'En Consulta' },
  { id: 'listo', label: 'Listo' },
];

interface StepProgressProps {
  currentStep: string;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = step.id === currentStep;
          const isCamino = step.id === 'camino';

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? isCamino
                        ? 'bg-green-500 text-white'
                        : 'bg-sky-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : isCamino ? '🚗' : i + 1}
                </div>
                <span
                  className={`mt-1 text-xs font-medium ${
                    isCurrent ? 'text-sky-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-1 flex-1 rounded ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
