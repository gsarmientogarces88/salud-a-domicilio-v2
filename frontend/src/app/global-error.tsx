'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-2xl font-bold text-red-600">Error inesperado</h1>
          <p className="max-w-md text-center text-gray-600">
            {error?.message || 'Error interno del servidor'}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-6 py-2 text-white hover:bg-sky-700"
          >
            Intentar de nuevo
          </button>
          <a href="/" className="text-sm text-sky-600 hover:underline">
            Volver al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
