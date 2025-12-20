import { useEffect, useMemo, useState } from "react";
import { addDocument } from "./documents.service";

import { getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";

export default function DocumentForm({
  onCreated,
  creadoPorUserId,
}: {
  onCreated: () => void;
  creadoPorUserId?: string;
}) {
  const [obra, setObra] = useState("");
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkers().then(setWorkers);
  }, []);

  const selectableWorkers = useMemo(
    () => workers.filter((w) => w.habilitado),
    [workers]
  );

  const toggleWorker = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!obra || !fecha) {
      setError("Completa obra y fecha");
      return;
    }

    if (!titulo.trim()) {
      setError("Ingresa un título");
      return;
    }

    if (!attachment) {
      setError("Selecciona un archivo");
      return;
    }

    if (selected.length === 0) {
      setError("Selecciona al menos un trabajador");
      return;
    }

    await addDocument({
      obra,
      fecha,
      titulo: titulo.trim(),
      categoria: categoria.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      asignados: selected.map((workerId) => ({
        workerId,
        token: crypto.randomUUID(),
      })),
      attachment: {
        fileName: attachment.name,
        mimeType: attachment.type || "application/octet-stream",
        blob: attachment,
      },
      creadoPorUserId,
    });

    setObra("");
    setFecha("");
    setTitulo("");
    setCategoria("");
    setDescripcion("");
    setAttachment(null);
    setSelected([]);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">📎</span>
          <span>Crear Documento</span>
        </h3>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500" style={{ marginTop: 0 }}>
          Sube un archivo (PDF/Word/Excel/otros), asígnalo a trabajadores y registra su firma.
        </p>

        <div className="form-grid">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Obra / Faena</span>
            <input value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Obra / Faena" />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Título</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Entrega EPP, Capacitación, Procedimiento..." />
          </div>

          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Categoría (opcional)</span>
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: EPP / Capacitación / Procedimiento" />
          </div>
        </div>

        <div className="flex flex-col" style={{ marginBottom: "1rem" }}>
          <span className="text-sm font-medium text-gray-500 mb-1">Descripción (opcional)</span>
          <textarea className="form-textarea" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Observaciones" />
        </div>

        <div className="flex flex-col" style={{ marginBottom: "1rem" }}>
          <span className="text-sm font-medium text-gray-500 mb-1">Archivo adjunto</span>
          <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
          {attachment && (
            <span className="text-xs text-gray-500" style={{ marginTop: 6 }}>
              Archivo: <strong>{attachment.name}</strong>
            </span>
          )}
          <span className="text-xs text-gray-500" style={{ marginTop: 6 }}>
            Si adjuntas un PDF, se intenta firmar el mismo documento. En otros formatos, se genera una constancia PDF firmada y el archivo original queda disponible para descarga.
          </span>
        </div>

        <strong className="form-section-title">👷 Trabajadores asignados</strong>

        {selectableWorkers.length === 0 ? (
          <p className="form-empty">
            No hay trabajadores habilitados. Habilita trabajadores para poder asignarlos.
          </p>
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
          Publicar Documento
        </button>
      </div>
    </div>
  );
}
