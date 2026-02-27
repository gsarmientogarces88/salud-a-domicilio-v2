export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold text-primary">🏥 Salud a Domicilio</h1>
      <p className="text-lg text-gray-600">Atención médica a domicilio en Chile</p>
      <div className="flex gap-4">
        <a href="/auth/login" className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-dark">
          Iniciar Sesión
        </a>
        <a href="/auth/register" className="rounded-lg border border-primary px-6 py-3 text-primary hover:bg-blue-50">
          Registrarse
        </a>
      </div>
    </main>
  );
}
