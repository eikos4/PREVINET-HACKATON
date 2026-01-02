import { useEffect, useMemo, useState } from "react";
import { addFitForWork } from "./fitForWork.service";
import { getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";

export default function FitForWorkForm({
  onCreated,
  creadoPorUserId,
}: {
  onCreated: () => void;
  creadoPorUserId?: string;
}) {
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState<"mañana" | "tarde" | "noche">("mañana");
  const [obra, setObra] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkers().then(setWorkers);
    const today = new Date().toISOString().split("T")[0];
    setFecha(today);
  }, []);

  const selectableWorkers = useMemo(() => workers.filter((w) => w.habilitado), [workers]);

  const toggleWorker = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError("");

    if (!fecha) {
      setError("Selecciona la fecha");
      return;
    }

    if (selected.length === 0) {
      setError("Selecciona al menos un trabajador");
      return;
    }

    await addFitForWork({
      fecha,
      turno,
      obra: obra.trim() || undefined,
      asignados: selected.map((workerId) => ({
        workerId,
        token: crypto.randomUUID(),
      })),
      creadoPorUserId,
    });

    setObra("");
    setSelected([]);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">✅</span>
          <span>Crear evaluación Fit-for-Work</span>
        </h3>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500" style={{ marginTop: 0 }}>
          Crea una evaluación de aptitud para que los trabajadores confirmen que están en condiciones de trabajar de forma segura.
        </p>

        <div className="form-grid">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Turno</span>
            <select value={turno} onChange={(e) => setTurno(e.target.value as any)}>
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </div>

          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Obra/Faena (opcional)</span>
            <input placeholder="Ej: Obra Central" value={obra} onChange={(e) => setObra(e.target.value)} />
          </div>
        </div>

        <strong className="form-section-title">👷 Trabajadores asignados</strong>

        {selectableWorkers.length === 0 ? (
          <p className="form-empty">No hay trabajadores habilitados. Habilita trabajadores para poder asignarlos.</p>
        ) : (
          <div className="worker-select-grid">
            {selectableWorkers.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`worker-select ${selected.includes(w.id) ? "selected" : ""}`}
                onClick={() => toggleWorker(w.id)}
              >
                <span className="worker-initial">{w.nombre.charAt(0).toUpperCase()}</span>
                <span>{w.nombre}</span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" onClick={handleSubmit}>
          Publicar evaluación
        </button>
      </div>
    </div>
  );
}
