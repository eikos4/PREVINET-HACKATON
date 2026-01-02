import { useEffect, useMemo, useState } from "react";
import type { Worker } from "../workers/worker.service";
import { getFitForWorkForWorker, signFitForWork } from "./fitForWork.service";
import type { FitForWork, FitForWorkQuestion } from "./fitForWork.service";
import SignatureModal from "../irl/SignatureModal";

export default function FitForWorkWorkerList({ worker }: { worker: Worker }) {
  const [evaluations, setEvaluations] = useState<FitForWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [pendingEvaluation, setPendingEvaluation] = useState<FitForWork | null>(null);
  const [responses, setResponses] = useState<FitForWorkQuestion[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);

  const load = () => {
    setLoading(true);
    getFitForWorkForWorker(worker.id)
      .then(setEvaluations)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [worker.id]);

  const sorted = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [evaluations]);

  const handleOpenEvaluation = (evaluation: FitForWork) => {
    setError("");
    setPendingEvaluation(evaluation);
    setResponses(evaluation.questions.map((q) => ({ ...q, response: undefined })));
    setShowSignatureModal(false);
    setShowQuestionnaireModal(true);
  };

  const handleResponseChange = (questionId: string, value: boolean) => {
    setResponses((prev) =>
      prev.map((r) => (r.id === questionId ? { ...r, response: value } : r))
    );
  };

  const allAnswered = responses.every((r) => r.response !== undefined);

  const handleConfirmSign = async (signatureDataUrl: string) => {
    if (!pendingEvaluation) return;

    if (!allAnswered) {
      setError("Debes responder todas las preguntas");
      return;
    }

    setError("");
    setSigningId(pendingEvaluation.id);

    try {
      const geo = await getGeoSafe();
      await signFitForWork(
        pendingEvaluation.id,
        worker.id,
        worker.nombre,
        worker.rut,
        responses,
        signatureDataUrl,
        geo ?? undefined
      );
      setShowSignatureModal(false);
      setShowQuestionnaireModal(false);
      setPendingEvaluation(null);
      setResponses([]);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo completar la evaluación";
      setError(message);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
            <span className="text-2xl">✅</span>
            <span>Evaluaciones Fit-for-Work</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            Cargando evaluaciones…
          </p>
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
            <span className="text-2xl">✅</span>
            <span>Evaluaciones Fit-for-Work</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No tienes evaluaciones asignadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">✅</span>
          <span>Evaluaciones Fit-for-Work</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="art-list">
          {sorted.map((e) => {
            const assignment = e.asignados.find((a) => a.workerId === worker.id);
            const completado = !!assignment?.firmadoEn;
            const apto = assignment?.apto ?? false;

            return (
              <div key={e.id} className="art-item">
                <div className="art-main">
                  <div className="art-date">
                    {formatDate(e.fecha)} - {e.turno.toUpperCase()}
                  </div>

                  <div>
                    <strong>Evaluación de Aptitud</strong>
                    {e.obra && <div className="art-meta">Obra: {e.obra}</div>}
                    {completado && assignment?.firmadoEn && (
                      <div className="art-meta">
                        Completado: {formatDateTime(assignment.firmadoEn)}
                        {apto ? (
                          <span style={{ color: "#16a34a", fontWeight: 600, marginLeft: "0.5rem" }}>
                            ✓ APTO
                          </span>
                        ) : (
                          <span style={{ color: "#dc2626", fontWeight: 600, marginLeft: "0.5rem" }}>
                            ✗ NO APTO
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {completado ? (
                  <span className="art-status" style={{ background: apto ? "#16a34a" : "#dc2626" }}>
                    {apto ? "Apto" : "No Apto"}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleOpenEvaluation(e)}
                    disabled={signingId === e.id}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                  >
                    {signingId === e.id ? "Procesando..." : "Completar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pendingEvaluation && showQuestionnaireModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
            padding: "1rem",
          }}
          onClick={() => {
            if (signingId) return;
            if (showSignatureModal) return;
            setPendingEvaluation(null);
            setResponses([]);
            setShowQuestionnaireModal(false);
            setShowSignatureModal(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem", fontWeight: 700 }}>
              Cuestionario de Aptitud
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", color: "#64748b", fontSize: "0.9rem" }}>
              Responde honestamente las siguientes preguntas para confirmar que estás apto para trabajar de forma segura.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {responses.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    padding: "1rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    background: "#f8fafc",
                  }}
                >
                  <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600, fontSize: "0.95rem" }}>
                    {idx + 1}. {q.question}
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => handleResponseChange(q.id, true)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        border: q.response === true ? "2px solid #16a34a" : "2px solid #e5e7eb",
                        borderRadius: "8px",
                        background: q.response === true ? "#f0fdf4" : "white",
                        color: q.response === true ? "#16a34a" : "#64748b",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      ✓ Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResponseChange(q.id, false)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        border: q.response === false ? "2px solid #dc2626" : "2px solid #e5e7eb",
                        borderRadius: "8px",
                        background: q.response === false ? "#fef2f2" : "white",
                        color: q.response === false ? "#dc2626" : "#64748b",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      ✗ No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!allAnswered && (
              <p style={{ color: "#f59e0b", fontSize: "0.875rem", margin: "0 0 1rem 0" }}>
                ⚠️ Debes responder todas las preguntas antes de firmar
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => {
                  if (signingId) return;
                  setPendingEvaluation(null);
                  setResponses([]);
                  setShowQuestionnaireModal(false);
                  setShowSignatureModal(false);
                }}
                disabled={signingId !== null}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "white",
                  fontWeight: 600,
                  cursor: signingId ? "not-allowed" : "pointer",
                  opacity: signingId ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!allAnswered) {
                    setError("Debes responder todas las preguntas");
                    return;
                  }
                  setShowQuestionnaireModal(false);
                  setShowSignatureModal(true);
                }}
                disabled={!allAnswered || signingId !== null}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  border: "none",
                  borderRadius: "10px",
                  background: allAnswered ? "linear-gradient(135deg, #16a34a, #15803d)" : "#e5e7eb",
                  color: "white",
                  fontWeight: 600,
                  cursor: allAnswered && !signingId ? "pointer" : "not-allowed",
                  opacity: allAnswered && !signingId ? 1 : 0.5,
                }}
              >
                Continuar a Firma
              </button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal
        open={showSignatureModal && !!pendingEvaluation && allAnswered}
        title="Firma de evaluación Fit-for-Work"
        subtitle={
          pendingEvaluation
            ? `${formatDate(pendingEvaluation.fecha)} · ${pendingEvaluation.turno.toUpperCase()}`
            : undefined
        }
        onCancel={() => {
          if (signingId) return;
          setShowSignatureModal(false);
          setShowQuestionnaireModal(true);
        }}
        onConfirm={handleConfirmSign}
      />
    </div>
  );
}

function formatDate(date: string | Date) {
  try {
    return new Date(date).toLocaleDateString("es-CL");
  } catch {
    return String(date);
  }
}

function formatDateTime(date: string | Date) {
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return String(date);
  }
}

async function getGeoSafe(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  if (!("geolocation" in navigator)) return null;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
      });
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch {
    return null;
  }
}
