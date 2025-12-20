import { useEffect, useMemo, useState } from "react";
import type { Worker } from "../workers/worker.service";
import { getTalksForWorker, signTalk } from "./talk.service";
import type { Talk } from "./talk.service";
import SignatureModal from "../irl/SignatureModal";

export default function TalkWorkerList({ worker }: { worker: Worker }) {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [pendingSignTalk, setPendingSignTalk] = useState<Talk | null>(null);

  const load = () => {
    setLoading(true);
    getTalksForWorker(worker.id)
      .then(setTalks)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [worker.id]);

  const sorted = useMemo(() => {
    return [...talks].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [talks]);

  const handleOpenSign = (talk: Talk) => {
    setError("");
    setPendingSignTalk(talk);
  };

  const handleConfirmSign = async (signatureDataUrl: string) => {
    if (!pendingSignTalk) return;

    setError("");
    setSigningId(pendingSignTalk.id);

    try {
      const geo = await getGeoSafe();
      await signTalk(pendingSignTalk.id, worker.id, worker.nombre, worker.rut, signatureDataUrl, geo ?? undefined);
      setPendingSignTalk(null);
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
            <span className="text-2xl">🗣️</span>
            <span>Charlas asignadas</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            Cargando charlas…
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
            <span className="text-2xl">🗣️</span>
            <span>Charlas asignadas</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No tienes charlas asignadas por firmar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">🗣️</span>
          <span>Charlas asignadas</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="art-list">
          {sorted.map((t) => {
            const assignment = t.asignados.find((a) => a.workerId === worker.id);
            const firmado = !!assignment?.firmadoEn;

            return (
              <div key={t.id} className="art-item">
                <div className="art-main">
                  <div className="art-date">{formatDateTime(t.fechaHora)}</div>

                  <div>
                    <strong>{t.tema}</strong>
                    {firmado && assignment?.firmadoEn && (
                      <div className="art-meta">Firmado: {formatDateTime(assignment.firmadoEn)}</div>
                    )}
                  </div>
                </div>

                {firmado ? (
                  <span className="art-status">Firmado</span>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleOpenSign(t)}
                    disabled={signingId === t.id}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                  >
                    {signingId === t.id ? "Firmando..." : "Firmar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SignatureModal
        open={!!pendingSignTalk}
        title="Firma de charla diaria"
        subtitle={pendingSignTalk ? `${pendingSignTalk.tema} · ${formatDateTime(pendingSignTalk.fechaHora)}` : undefined}
        onCancel={() => {
          if (signingId) return;
          setPendingSignTalk(null);
        }}
        onConfirm={handleConfirmSign}
      />
    </div>
  );
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
