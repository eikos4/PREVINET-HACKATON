import { useEffect, useMemo, useState } from "react";
import type { ART, ARTVerificationQuestion } from "./art.service";
import { downloadBlobAsFile } from "./artPdf.service";

type Props = {
  open: boolean;
  art: ART | null;
  onCancel: () => void;
  onContinue: (params: { answers: { q1: number; q2: number }; verificationAt: Date }) => void;
};

export default function ARTReadConfirmModal({ open, art, onCancel, onContinue }: Props) {
  const [viewedAttachment, setViewedAttachment] = useState(false);
  const [q1Selected, setQ1Selected] = useState<number | null>(null);
  const [q2Selected, setQ2Selected] = useState<number | null>(null);
  const [error, setError] = useState("");

  const hasAttachment = !!art?.attachment?.blob;

  useEffect(() => {
    if (!open) return;
    setError("");
    setQ1Selected(null);
    setQ2Selected(null);
    setViewedAttachment(!hasAttachment);
  }, [open, hasAttachment]);

  const questions = useMemo(() => {
    const list = (art?.verificationQuestions ?? []) as ARTVerificationQuestion[];
    return list.length === 2 ? list : [];
  }, [art]);

  const expectedQ1 = useMemo(() => {
    return questions.find((q) => q.id === "q1")?.correctOptionIndex;
  }, [questions]);

  const expectedQ2 = useMemo(() => {
    return questions.find((q) => q.id === "q2")?.correctOptionIndex;
  }, [questions]);

  const canContinue = useMemo(() => {
    if (!viewedAttachment) return false;
    if (!questions || questions.length !== 2) return true;
    if (q1Selected === null || q2Selected === null) return false;
    if (expectedQ1 === undefined || expectedQ2 === undefined) return false;
    return q1Selected === expectedQ1 && q2Selected === expectedQ2;
  }, [expectedQ1, expectedQ2, q1Selected, q2Selected, questions, viewedAttachment]);

  const openAttachment = () => {
    if (!art?.attachment?.blob || !art.attachment.fileName) return;

    const mime = art.attachment.mimeType || "application/octet-stream";
    const isPdf = mime === "application/pdf" || art.attachment.fileName.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const url = URL.createObjectURL(art.attachment.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      downloadBlobAsFile(art.attachment.blob, art.attachment.fileName);
    }

    setViewedAttachment(true);
  };

  const handleContinue = () => {
    setError("");

    if (!viewedAttachment) {
      setError("Debes abrir o descargar el archivo antes de continuar");
      return;
    }

    if (questions && questions.length === 2) {
      if (q1Selected === null || q2Selected === null) {
        setError("Debes responder ambas preguntas antes de continuar");
        return;
      }

      if (!canContinue) {
        setError("Respuestas incorrectas. Revisa el documento antes de firmar");
        return;
      }
    }

    onContinue({
      answers: { q1: q1Selected ?? 0, q2: q2Selected ?? 0 },
      verificationAt: new Date(),
    });
  };

  if (!open || !art) return null;

  const q1 = questions.find((q) => q.id === "q1");
  const q2 = questions.find((q) => q.id === "q2");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", padding: "1rem" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-gray-200 w-full"
        style={{ maxWidth: 860 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold text-gray-900">Leer ART/AST antes de firmar</div>
          <div className="text-sm text-gray-500" style={{ marginTop: 4 }}>
            {art.obra} · {art.fecha}
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900" style={{ marginBottom: 6 }}>
                Riesgos / medidas
              </div>
              <div className="text-sm text-gray-700" style={{ whiteSpace: "pre-wrap" }}>
                {art.riesgos || "-"}
              </div>
            </div>

            {art.attachment?.fileName && art.attachment.blob && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-900" style={{ marginBottom: 6 }}>
                  Archivo adjunto
                </div>
                <div className="text-sm text-gray-700" style={{ marginBottom: 10 }}>
                  {art.attachment.fileName}
                </div>

                <button type="button" className="btn-secondary" onClick={openAttachment}>
                  {viewedAttachment ? "Archivo abierto" : "Abrir / Descargar archivo"}
                </button>

                {!viewedAttachment && (
                  <div className="text-xs text-gray-500" style={{ marginTop: 8 }}>
                    Debes abrir o descargar el archivo antes de continuar.
                  </div>
                )}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900" style={{ marginBottom: 10 }}>
                Preguntas de verificación
              </div>

              {!q1 || !q2 ? (
                <div className="text-sm text-gray-600">No hay preguntas configuradas.</div>
              ) : (
                <div className="grid" style={{ gap: 14 }}>
                  <div>
                    <div className="text-sm text-gray-800" style={{ marginBottom: 8 }}>
                      {q1.question}
                    </div>
                    <div className="grid" style={{ gap: 8 }}>
                      {q1.options.map((opt, idx) => (
                        <label key={`q1-${idx}`} className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="art-q1"
                            checked={q1Selected === idx}
                            onChange={() => setQ1Selected(idx)}
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-800" style={{ marginBottom: 8 }}>
                      {q2.question}
                    </div>
                    <div className="grid" style={{ gap: 8 }}>
                      {q2.options.map((opt, idx) => (
                        <label key={`q2-${idx}`} className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="art-q2"
                            checked={q2Selected === idx}
                            onChange={() => setQ2Selected(idx)}
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm" style={{ color: "#dc2626" }}>
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={!canContinue} onClick={handleContinue}>
            Continuar a firma
          </button>
        </div>
      </div>
    </div>
  );
}
