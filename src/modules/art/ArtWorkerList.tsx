import { useEffect, useMemo, useState } from "react";
import type { Worker } from "../workers/worker.service";
import type { ART } from "./art.service";
import { getARTsForWorker, signART } from "./art.service";
import SignatureModal from "../irl/SignatureModal";
import { downloadBlobAsFile } from "./artPdf.service";
import ARTReadConfirmModal from "./ARTReadConfirmModal";

export default function ArtWorkerList({ worker }: { worker: Worker }) {
  const [arts, setArts] = useState<ART[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [pendingReadArt, setPendingReadArt] = useState<ART | null>(null);
  const [verificationParams, setVerificationParams] = useState<
    { answers: { q1: number; q2: number }; verificationAt: Date } | null
  >(null);
  const [pendingSignArt, setPendingSignArt] = useState<ART | null>(null);

  const load = () => {
    setLoading(true);
    getARTsForWorker(worker.id)
      .then(setArts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [worker.id]);

  const sorted = useMemo(() => {
    return [...arts].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [arts]);

  const handleOpenSign = (art: ART) => {
    setError("");
    setVerificationParams(null);
    setPendingSignArt(null);
    setPendingReadArt(art);
  };

  const handleConfirmSign = async (signatureDataUrl: string) => {
    if (!pendingSignArt) return;

    setError("");
    setSigningId(pendingSignArt.id);

    try {
      const geo = await getGeoSafe();
      await signART(
        pendingSignArt.id,
        worker.id,
        worker.nombre,
        worker.rut,
        verificationParams ?? undefined,
        signatureDataUrl,
        geo ?? undefined
      );
      setPendingSignArt(null);
      setVerificationParams(null);
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
            <span className="text-2xl">📝</span>
            <span>ART/AST asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            Cargando ART/AST…
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
            <span className="text-2xl">📝</span>
            <span>ART/AST asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No tienes ART/AST asignados por firmar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">📝</span>
          <span>ART/AST asignados</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="art-list">
          {sorted.map((a) => {
            const assignment = a.asignados?.find((x) => x.workerId === worker.id);
            const firmado = !!assignment?.firmadoEn;

            return (
              <div key={a.id} className="art-item">
                <div className="art-main">
                  <div className="art-date">{formatDate(a.fecha)}</div>

                  <div>
                    <strong>{a.obra}</strong>
                    <div className="art-meta">ART/AST diario</div>
                    {a.attachment?.fileName && (
                      <div className="art-meta">
                        Documento: {a.attachment.fileName}
                      </div>
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
                    {a.attachment?.blob && a.attachment.fileName && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => downloadBlobAsFile(a.attachment!.blob, a.attachment!.fileName)}
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                      >
                        Ver archivo
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenSign(a)}
                      disabled={signingId === a.id}
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                    >
                      {signingId === a.id ? "Firmando..." : "Firmar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SignatureModal
        open={!!pendingSignArt}
        title="Firma de ART/AST"
        subtitle={
          pendingSignArt
            ? `${pendingSignArt.obra} · ${formatDate(pendingSignArt.fecha)}`
            : undefined
        }
        onCancel={() => {
          if (signingId) return;
          setPendingSignArt(null);
          setVerificationParams(null);
        }}
        onConfirm={handleConfirmSign}
      />

      <ARTReadConfirmModal
        open={!!pendingReadArt}
        art={pendingReadArt}
        onCancel={() => {
          if (signingId) return;
          setPendingReadArt(null);
          setVerificationParams(null);
        }}
        onContinue={(params) => {
          if (!pendingReadArt) return;
          setVerificationParams(params);
          setPendingSignArt(pendingReadArt);
          setPendingReadArt(null);
        }}
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
