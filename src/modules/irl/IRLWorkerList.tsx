import { useEffect, useMemo, useState } from "react";
import type { Worker } from "../workers/worker.service";
import { getIRLsForWorker, signIRL } from "./irl.service";
import type { IRL } from "./irl.service";
import SignatureModal from "./SignatureModal";
import IRLReadConfirmModal from "./IRLReadConfirmModal";
import { downloadBlobAsFile } from "./irlPdf.service";

export default function IRLWorkerList({ worker }: { worker: Worker }) {
  const [irls, setIrls] = useState<IRL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [readingIrl, setReadingIrl] = useState<IRL | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    verificationAnswers: { q1: string; q2: string };
    verificationAt: Date;
  } | null>(null);
  const [pendingSignIrl, setPendingSignIrl] = useState<IRL | null>(null);

  const load = () => {
    setLoading(true);
    getIRLsForWorker(worker.id)
      .then(setIrls)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [worker.id]);

  const sorted = useMemo(() => {
    return [...irls].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [irls]);

  const handleOpenSign = (irl: IRL) => {
    setError("");
    setPendingConfirm(null);
    setPendingSignIrl(null);
    setReadingIrl(irl);
  };

  const handleConfirmedRead = (params: {
    verificationAnswers: { q1: string; q2: string };
    verificationAt: Date;
  }) => {
    if (!readingIrl) return;
    setPendingConfirm(params);
    setPendingSignIrl(readingIrl);
    setReadingIrl(null);
  };

  const handleConfirmSign = async (signatureDataUrl: string) => {
    if (!pendingSignIrl) return;
    if (!pendingConfirm) {
      setError("Debes leer y responder las preguntas antes de firmar");
      return;
    }

    setError("");
    setSigningId(pendingSignIrl.id);

    try {
      const geo = await getGeoSafe();
      await signIRL(
        pendingSignIrl.id,
        worker.id,
        worker.nombre,
        worker.rut,
        pendingConfirm.verificationAnswers,
        pendingConfirm.verificationAt,
        signatureDataUrl,
        geo ?? undefined
      );
      setPendingSignIrl(null);
      setPendingConfirm(null);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo firmar";
      setError(message);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
            <span className="text-2xl">🧾</span>
            <span>IRL asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            Cargando IRL…
          </p>
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
            <span className="text-2xl">🧾</span>
            <span>IRL asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No tienes IRL asignados por firmar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">🧾</span>
          <span>IRL asignados</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="art-list">
          {sorted.map((i) => {
            const assignment = i.asignados.find((a) => a.workerId === worker.id);
            const firmado = !!assignment?.firmadoEn;

            return (
              <div key={i.id} className="art-item">
                <div className="art-main">
                  <div className="art-date">{formatDate(i.fecha)}</div>

                  <div>
                    <strong>{i.titulo}</strong>
                    <div className="art-meta">{i.obra}</div>
                    {i.attachment?.fileName && (
                      <div className="art-meta">Documento: {i.attachment.fileName}</div>
                    )}
                    {firmado && assignment?.firmadoEn && (
                      <div className="art-meta">
                        Firmado: {formatDateTime(assignment.firmadoEn)}
                      </div>
                    )}
                  </div>
                </div>

                {firmado ? (
                  <span className="art-status">Firmado</span>
                ) : (
                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    {i.attachment?.blob && i.attachment.fileName && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => downloadBlobAsFile(i.attachment!.blob, i.attachment!.fileName)}
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                      >
                        Ver archivo
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenSign(i)}
                      disabled={signingId === i.id}
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                    >
                      {signingId === i.id ? "Firmando..." : "Firmar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SignatureModal
        open={!!pendingSignIrl}
        title="Firma de IRL"
        subtitle={
          pendingSignIrl
            ? `${pendingSignIrl.titulo} · ${pendingSignIrl.obra} · ${formatDate(pendingSignIrl.fecha)}`
            : undefined
        }
        onCancel={() => {
          if (signingId) return;
          setPendingSignIrl(null);
          setPendingConfirm(null);
        }}
        onConfirm={handleConfirmSign}
      />

      <IRLReadConfirmModal
        open={!!readingIrl}
        irl={readingIrl}
        onCancel={() => {
          if (signingId) return;
          setReadingIrl(null);
        }}
        onContinue={handleConfirmedRead}
      />
    </div>
  );
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

function formatDateTime(date: Date) {
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
