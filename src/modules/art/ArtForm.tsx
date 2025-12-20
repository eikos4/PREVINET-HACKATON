import { useEffect, useState } from "react";
import { addART } from "./art.service";

import { getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";

export default function ArtForm({
  onCreated,
  creadoPorUserId,
}: {
  onCreated: () => void;
  creadoPorUserId?: string;
}) {
  const [mode, setMode] = useState<"form" | "file">("form");
  const [obra, setObra] = useState("");
  const [fecha, setFecha] = useState("");
  const [riesgos, setRiesgos] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [q1, setQ1] = useState("");
  const [q1o1, setQ1o1] = useState("");
  const [q1o2, setQ1o2] = useState("");
  const [q1o3, setQ1o3] = useState("");
  const [q1Correct, setQ1Correct] = useState<number>(0);
  const [q2, setQ2] = useState("");
  const [q2o1, setQ2o1] = useState("");
  const [q2o2, setQ2o2] = useState("");
  const [q2o3, setQ2o3] = useState("");
  const [q2Correct, setQ2Correct] = useState<number>(0);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkers().then(setWorkers);
  }, []);

  const toggleWorker = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((w) => w !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!obra || !fecha || selected.length === 0) {
      setError("Completa obra, fecha y selecciona al menos un trabajador");
      return;
    }

    const normalizedQ1 = q1.trim();
    const normalizedQ2 = q2.trim();
    const q1Options = [q1o1, q1o2, q1o3].map((x) => x.trim()).filter(Boolean);
    const q2Options = [q2o1, q2o2, q2o3].map((x) => x.trim()).filter(Boolean);

    if (!normalizedQ1 || !normalizedQ2) {
      setError("Debes ingresar 2 preguntas de verificación");
      return;
    }

    if (q1Options.length < 2 || q2Options.length < 2) {
      setError("Cada pregunta debe tener al menos 2 alternativas");
      return;
    }

    if (q1Correct < 0 || q1Correct >= q1Options.length || q2Correct < 0 || q2Correct >= q2Options.length) {
      setError("Debes marcar una alternativa correcta por pregunta");
      return;
    }

    if (mode === "file") {
      if (!attachment) {
        setError("Selecciona un archivo (PDF o Word)");
        return;
      }

      const name = (attachment.name || "").toLowerCase();
      const looksPdf = name.endsWith(".pdf");
      const looksDoc = name.endsWith(".doc") || name.endsWith(".docx");

      const isAllowed =
        attachment.type === "application/pdf" ||
        attachment.type === "application/msword" ||
        attachment.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        looksPdf ||
        looksDoc;

      if (!isAllowed) {
        setError("Formato no soportado. Solo PDF o Word (.doc/.docx)");
        return;
      }
    }

    await addART({
      obra,
      fecha,
      trabajadores: selected,
      asignados: selected.map((workerId) => ({
        workerId,
        token: crypto.randomUUID(),
      })),
      riesgos,
      verificationQuestions: [
        {
          id: "q1",
          question: normalizedQ1,
          options: q1Options,
          correctOptionIndex: q1Correct,
        },
        {
          id: "q2",
          question: normalizedQ2,
          options: q2Options,
          correctOptionIndex: q2Correct,
        },
      ],
      attachment: attachment
        ? {
            fileName: attachment.name,
            mimeType: inferMimeType(attachment.name, attachment.type),
            blob: attachment,
          }
        : undefined,
      cerrado: true,
      creadoPorUserId,
    });

    setObra("");
    setFecha("");
    setRiesgos("");
    setAttachment(null);
    setQ1("");
    setQ1o1("");
    setQ1o2("");
    setQ1o3("");
    setQ1Correct(0);
    setQ2("");
    setQ2o1("");
    setQ2o2("");
    setQ2o3("");
    setQ2Correct(0);
    setSelected([]);
    onCreated();
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>📝 Nuevo ART/AST</h3>
      <p className="form-hint">
        Análisis de Riesgos del Trabajo para la jornada
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

      {/* DATOS GENERALES */}
      <div className="form-grid">
        <input
          placeholder="Obra / Faena"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
        />

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {/* RIESGOS */}
      {mode === "form" ? (
        <textarea
          className="form-textarea"
          placeholder="Riesgos identificados y medidas preventivas"
          value={riesgos}
          onChange={(e) => setRiesgos(e.target.value)}
        />
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
            Al firmar se genera un PDF firmado (certificado) y el archivo original queda disponible para descarga.
          </span>
        </div>
      )}

      {/* TRABAJADORES */}
      <strong className="form-section-title">
        👷 Trabajadores participantes
      </strong>

      {workers.length === 0 ? (
        <p className="form-empty">
          No hay trabajadores enrolados.
        </p>
      ) : (
        <div className="worker-select-grid">
          {workers.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`worker-select ${
                selected.includes(w.id) ? "selected" : ""
              }`}
              onClick={() => toggleWorker(w.id)}
            >
              <span className="worker-initial">
                {w.nombre.charAt(0).toUpperCase()}
              </span>
              <span>{w.nombre}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">✅ Preguntas de verificación</div>
            <div className="mt-1 text-sm text-gray-600">
              El trabajador deberá abrir el documento y responder correctamente antes de firmar.
            </div>
          </div>
          <div className="text-xs text-gray-500">Marca la alternativa correcta</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pregunta 1</div>

            <input
              id="art-q1"
              placeholder="Escribe la pregunta"
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />

            <div className="mt-3 grid" style={{ gap: 10 }}>
              {[q1o1, q1o2, q1o3].map((v, idx) => (
                <div key={`q1-opt-${idx}`} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="q1-correct"
                    checked={q1Correct === idx}
                    onChange={() => setQ1Correct(idx)}
                    className="mt-3"
                    aria-label={`Correcta pregunta 1 alternativa ${idx + 1}`}
                  />

                  <div className="flex-1">
                    <input
                      id={`art-q1-opt-${idx}`}
                      placeholder={`Alternativa ${idx + 1}`}
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (idx === 0) setQ1o1(val);
                        if (idx === 1) setQ1o2(val);
                        if (idx === 2) setQ1o3(val);
                      }}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />

                    {q1Correct === idx && (
                      <div className="mt-1 text-xs font-semibold text-blue-700">Correcta</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pregunta 2</div>

            <input
              id="art-q2"
              placeholder="Escribe la pregunta"
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />

            <div className="mt-3 grid" style={{ gap: 10 }}>
              {[q2o1, q2o2, q2o3].map((v, idx) => (
                <div key={`q2-opt-${idx}`} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="q2-correct"
                    checked={q2Correct === idx}
                    onChange={() => setQ2Correct(idx)}
                    className="mt-3"
                    aria-label={`Correcta pregunta 2 alternativa ${idx + 1}`}
                  />

                  <div className="flex-1">
                    <input
                      id={`art-q2-opt-${idx}`}
                      placeholder={`Alternativa ${idx + 1}`}
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (idx === 0) setQ2o1(val);
                        if (idx === 1) setQ2o2(val);
                        if (idx === 2) setQ2o3(val);
                      }}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />

                    {q2Correct === idx && (
                      <div className="mt-1 text-xs font-semibold text-blue-700">Correcta</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit}>
        Guardar ART
      </button>
    </div>
  );
}

function inferMimeType(fileName: string, providedMimeType: string) {
  const mime = (providedMimeType || "").trim();
  if (mime) return mime;

  const lower = (fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}
