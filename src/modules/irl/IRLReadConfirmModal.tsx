import { useEffect, useMemo, useState } from "react";
import { getIRLVerificationQuestions } from "./irl.service";
import type { IRL } from "./irl.service";
import { downloadBlobAsFile } from "./irlPdf.service";

type Props = {
  open: boolean;
  irl: IRL | null;
  onCancel: () => void;
  onContinue: (params: { verificationAnswers: { q1: string; q2: string }; verificationAt: Date }) => void;
};

export default function IRLReadConfirmModal({ open, irl, onCancel, onContinue }: Props) {
  const [viewedAttachment, setViewedAttachment] = useState(false);
  const [q1Answer, setQ1Answer] = useState("");
  const [q2Answer, setQ2Answer] = useState("");
  const [error, setError] = useState("");

  const hasAttachment = !!irl?.attachment?.blob;

  useEffect(() => {
    if (!open) return;
    setError("");
    setQ1Answer("");
    setQ2Answer("");
    setViewedAttachment(!hasAttachment);
  }, [open, hasAttachment]);

  const questions = useMemo(() => {
    if (!irl) return [];
    return irl.verificationQuestions && irl.verificationQuestions.length === 2
      ? irl.verificationQuestions
      : getIRLVerificationQuestions(irl);
  }, [irl]);

  const expectedQ1 = useMemo(() => {
    return (questions.find((q) => q.id === "q1")?.expectedAnswer ?? "").trim().toLowerCase();
  }, [questions]);

  const expectedQ2 = useMemo(() => {
    return (questions.find((q) => q.id === "q2")?.expectedAnswer ?? "").trim().toLowerCase();
  }, [questions]);

  const givenQ1 = useMemo(() => q1Answer.trim().toLowerCase(), [q1Answer]);
  const givenQ2 = useMemo(() => q2Answer.trim().toLowerCase(), [q2Answer]);

  const canContinue = useMemo(() => {
    if (!viewedAttachment) return false;
    if (!givenQ1 || !givenQ2) return false;
    if (!expectedQ1 || !expectedQ2) return false;
    return givenQ1 === expectedQ1 && givenQ2 === expectedQ2;
  }, [viewedAttachment, givenQ1, givenQ2, expectedQ1, expectedQ2]);

  const openAttachment = () => {
    if (!irl?.attachment?.blob || !irl.attachment.fileName) return;

    const mime = irl.attachment.mimeType || "application/octet-stream";
    const isPdf = mime === "application/pdf" || irl.attachment.fileName.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const url = URL.createObjectURL(irl.attachment.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      downloadBlobAsFile(irl.attachment.blob, irl.attachment.fileName);
    }

    setViewedAttachment(true);
  };

  const handleContinue = () => {
    setError("");

    if (!viewedAttachment) {
      setError("Debes abrir o descargar el archivo antes de continuar");
      return;
    }

    if (!q1Answer.trim() || !q2Answer.trim()) {
      setError("Debes responder ambas preguntas antes de continuar");
      return;
    }

    if (!canContinue) {
      setError("Respuestas incorrectas. Revisa el IRL antes de firmar");
      return;
    }

    onContinue({
      verificationAnswers: { q1: q1Answer, q2: q2Answer },
      verificationAt: new Date(),
    });
  };

  if (!open || !irl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", padding: "1rem" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-gray-200 w-full"
        style={{ maxWidth: 820 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold text-gray-900">Leer IRL antes de firmar</div>
          <div className="text-sm text-gray-500" style={{ marginTop: 4 }}>
            {irl.titulo} · {irl.obra}
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900" style={{ marginBottom: 6 }}>
                Descripción
              </div>
              <div className="text-sm text-gray-700" style={{ whiteSpace: "pre-wrap" }}>
                {irl.descripcion || "-"}
              </div>
            </div>

            {irl.attachment?.fileName && irl.attachment.blob && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-900" style={{ marginBottom: 6 }}>
                  Archivo adjunto
                </div>
                <div className="text-sm text-gray-700" style={{ marginBottom: 10 }}>
                  {irl.attachment.fileName}
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

              <div className="grid" style={{ gap: 10 }}>
                <div>
                  <div className="text-sm text-gray-700" style={{ marginBottom: 6 }}>
                    {questions.find((q) => q.id === "q1")?.question ?? "Pregunta 1"}
                  </div>
                  <input
                    value={q1Answer}
                    onChange={(e) => setQ1Answer(e.target.value)}
                    placeholder="Escribe tu respuesta"
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-700" style={{ marginBottom: 6 }}>
                    {questions.find((q) => q.id === "q2")?.question ?? "Pregunta 2"}
                  </div>
                  <input
                    value={q2Answer}
                    onChange={(e) => setQ2Answer(e.target.value)}
                    placeholder="Escribe tu respuesta"
                  />
                </div>

                {error && (
                  <div className="text-sm" style={{ color: "#dc2626" }}>
                    {error}
                  </div>
                )}
              </div>
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
