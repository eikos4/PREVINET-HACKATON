import { useEffect, useMemo, useState } from "react";
import { addIRL } from "./irl.service";

import { getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";

export default function IRLForm({
  onCreated,
  creadoPorUserId,
}: {
  onCreated: () => void;
  creadoPorUserId?: string;
}) {
  const [mode, setMode] = useState<"form" | "file">("form");
  const [obra, setObra] = useState("");
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [q1Question, setQ1Question] = useState("");
  const [q1Expected, setQ1Expected] = useState("");
  const [q2Question, setQ2Question] = useState("");
  const [q2Expected, setQ2Expected] = useState("");
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

    if (selected.length === 0) {
      setError("Selecciona al menos un trabajador");
      return;
    }

    if (mode === "file") {
      if (!attachment) {
        setError("Selecciona un archivo (PDF o Word)");
        return;
      }

      const isAllowed =
        attachment.type === "application/pdf" ||
        attachment.type === "application/msword" ||
        attachment.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (!isAllowed) {
        setError("Formato no soportado. Solo PDF o Word (.doc/.docx)");
        return;
      }
    } else {
      if (!titulo || !descripcion) {
        setError("Todos los campos son obligatorios");
        return;
      }
    }

    const tituloFinal =
      mode === "file"
        ? titulo || (attachment ? stripExtension(attachment.name) : "IRL")
        : titulo;
    const descripcionFinal =
      mode === "file"
        ? descripcion || (attachment ? `Documento adjunto: ${attachment.name}` : "-")
        : descripcion;

    const defaultQ1Question = "¿Cuál es la obra / faena indicada en el IRL?";
    const defaultQ1Expected = obra;
    const defaultQ2Question = attachment
      ? "¿Cuál es el nombre del archivo adjunto?"
      : "¿Cuál es el título del IRL?";
    const defaultQ2Expected = attachment ? attachment.name : tituloFinal;

    const finalQ1Question = (q1Question || defaultQ1Question).trim();
    const finalQ1Expected = (q1Expected || defaultQ1Expected).trim();
    const finalQ2Question = (q2Question || defaultQ2Question).trim();
    const finalQ2Expected = (q2Expected || defaultQ2Expected).trim();

    if (!finalQ1Question || !finalQ1Expected || !finalQ2Question || !finalQ2Expected) {
      setError("Completa las 2 preguntas y sus respuestas esperadas");
      return;
    }

    await addIRL({
      obra,
      fecha,
      titulo: tituloFinal,
      descripcion: descripcionFinal,
      verificationQuestions: [
        { id: "q1", question: finalQ1Question, expectedAnswer: finalQ1Expected },
        { id: "q2", question: finalQ2Question, expectedAnswer: finalQ2Expected },
      ],
      asignados: selected.map((workerId) => ({
        workerId,
        token: crypto.randomUUID(),
      })),
      attachment: attachment
        ? {
            fileName: attachment.name,
            mimeType: attachment.type || "application/octet-stream",
            blob: attachment,
          }
        : undefined,
      creadoPorUserId,
    });

    setObra("");
    setFecha("");
    setTitulo("");
    setDescripcion("");
    setAttachment(null);
    setQ1Question("");
    setQ1Expected("");
    setQ2Question("");
    setQ2Expected("");
    setSelected([]);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">🧾</span>
          <span>Crear IRL</span>
        </h3>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500" style={{ marginTop: 0 }}>
          Crea un IRL y asigna los trabajadores que deben firmarlo.
        </p>

        <div className="flex" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className={mode === "form" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("form")}
            style={{ padding: "0.4rem 0.7rem", fontSize: "0.9rem" }}
          >
            Crear con formulario
          </button>
          <button
            type="button"
            className={mode === "file" ? "btn-primary" : "btn-secondary"}
            onClick={() => setMode("file")}
            style={{ padding: "0.4rem 0.7rem", fontSize: "0.9rem" }}
          >
            Cargar archivo (PDF/Word)
          </button>
        </div>

        <div className="form-grid">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Obra / Faena</span>
            <input
              placeholder="Obra / Faena"
              value={obra}
              onChange={(e) => setObra(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          {mode === "form" && (
            <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
              <span className="text-sm font-medium text-gray-500 mb-1">Título</span>
              <input
                placeholder="Título del IRL"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
          )}
        </div>

        {mode === "form" ? (
          <div className="flex flex-col" style={{ marginBottom: "1rem" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Descripción</span>
            <textarea
              className="form-textarea"
              placeholder="Descripción / observaciones"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-col" style={{ marginBottom: "1rem" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Documento adjunto</span>
            <input
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            {attachment && (
              <span className="text-xs text-gray-500" style={{ marginTop: 6 }}>
                Archivo: <strong>{attachment.name}</strong>
              </span>
            )}
            <span className="text-xs text-gray-500" style={{ marginTop: 6 }}>
              Si adjuntas un PDF, se firma el mismo documento. Si adjuntas Word, se genera un PDF firmado y el Word queda disponible para descarga.
            </span>
          </div>
        )}

        <strong className="form-section-title">✅ Preguntas de verificación (obligatorio)</strong>

        <div className="form-grid" style={{ marginBottom: "1rem" }}>
          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Pregunta 1</span>
            <input
              placeholder="Ej: ¿Cuál es la obra / faena indicada en el IRL?"
              value={q1Question}
              onChange={(e) => setQ1Question(e.target.value)}
            />
          </div>
          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Respuesta esperada 1</span>
            <input
              placeholder={obra ? obra : "Respuesta esperada"}
              value={q1Expected}
              onChange={(e) => setQ1Expected(e.target.value)}
            />
          </div>

          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Pregunta 2</span>
            <input
              placeholder={
                mode === "file"
                  ? "Ej: ¿Cuál es el nombre del archivo adjunto?"
                  : "Ej: ¿Cuál es el título del IRL?"
              }
              value={q2Question}
              onChange={(e) => setQ2Question(e.target.value)}
            />
          </div>
          <div className="flex flex-col" style={{ gridColumn: "1 / -1" }}>
            <span className="text-sm font-medium text-gray-500 mb-1">Respuesta esperada 2</span>
            <input
              placeholder={
                mode === "file"
                  ? attachment?.name || "Nombre del archivo"
                  : titulo || "Título del IRL"
              }
              value={q2Expected}
              onChange={(e) => setQ2Expected(e.target.value)}
            />
          </div>
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
          Publicar IRL
        </button>
      </div>
    </div>
  );
}

function stripExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}
