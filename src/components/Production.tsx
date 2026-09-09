import { useReveal } from "../hooks";

export default function Production({ hivesCount }: { hivesCount: number }) {
  const { ref, inView } = useReveal();

  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} card p-6 sm:p-8`}>
      <div className="mb-6">
        <p className="tick-label">Registro de cosechas</p>
        <p className="mt-2 text-sm text-husk">
          Las cosechas se registrarán aquí cuando agregues datos de producción a tus colmenas.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-ink/60 p-4">
          <p className="tick-label">Colmenas activas</p>
          <p className="mt-2 font-display text-3xl font-black text-cream">{hivesCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-ink/60 p-4">
          <p className="tick-label">Miel total</p>
          <p className="mt-2 font-display text-3xl font-black text-honey">0 kg</p>
        </div>
        <div className="rounded-xl border border-line bg-ink/60 p-4">
          <p className="tick-label">Rendimiento</p>
          <p className="mt-2 font-display text-3xl font-black text-cream">
            {hivesCount > 0 ? '0.0' : '0'} kg/colmena
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-husk">
        Agrega cosechas desde el panel de cada colmena para ver estadísticas aquí
      </p>
    </div>
  );
}
