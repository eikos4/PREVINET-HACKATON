import { useEffect, useMemo, useState } from "react";
import { addTalk } from "./talk.service";

import { getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";

export default function TalkForm({
  onCreated,
  creadoPorUserId,
}: {
  onCreated: () => void;
  creadoPorUserId?: string;
}) {
  const [tema, setTema] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkers().then(setWorkers);
  }, []);

  const selectableWorkers = useMemo(() => workers.filter((w) => w.habilitado), [workers]);

  const toggleWorker = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError("");

    if (!tema || !fechaHora) {
      setError("Completa tema y fecha/hora");
      return;
    }

    if (selected.length === 0) {
      setError("Selecciona al menos un trabajador");
      return;
    }

    await addTalk({
      tema,
      fechaHora,
      asignados: selected.map((workerId) => ({
        workerId,
        token: crypto.randomUUID(),
      })),
      creadoPorUserId,
    });

    setTema("");
    setFechaHora("");
    setSelected([]);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">🗣️</span>
          <span>Crear charla diaria (5 minutos)</span>
        </h3>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500" style={{ marginTop: 0 }}>
          Registra la charla del día y asigna los trabajadores que deben firmarla.
        </p>

        <div className="form-grid">
          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Tema</span>
            <input placeholder="Tema de la charla" value={tema} onChange={(e) => setTema(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Fecha y hora</span>
            <input type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} />
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
          Publicar charla
        </button>
      </div>
    </div>
  );
}
