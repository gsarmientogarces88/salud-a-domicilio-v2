'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error capturado:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold text-red-600">Algo salió mal</h1>
      <p className="max-w-md text-center text-gray-600">
        {error.message || 'Error interno del servidor'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-sky-600 px-6 py-2 text-white hover:bg-sky-700"
      >
        Intentar de nuevo
      </button>
      <a
        href="/"
        className="text-sm text-sky-600 hover:underline"
      >
        Volver al inicio
      </a>
    </div>
  );
}
