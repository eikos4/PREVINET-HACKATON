import { useEffect, useMemo, useState } from "react";
import type { Worker } from "../workers/worker.service";
import type { DocumentRecord } from "./documents.service";
import { getDocumentsForWorker, signDocument } from "./documents.service";
import SignatureModal from "../irl/SignatureModal";
import {
  downloadBlobAsFile,
  getSignedDocumentPdfByKey,
} from "./documentsPdf.service";

export default function DocumentWorkerList({ worker }: { worker: Worker }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [pendingSignDoc, setPendingSignDoc] = useState<DocumentRecord | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getDocumentsForWorker(worker.id)
      .then(setDocs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [worker.id]);

  const sorted = useMemo(() => {
    return [...docs].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [docs]);

  const handleOpenSign = (doc: DocumentRecord) => {
    setError("");
    setPendingSignDoc(doc);
  };

  const handleConfirmSign = async (signatureDataUrl: string) => {
    if (!pendingSignDoc) return;

    setError("");
    setSigningId(pendingSignDoc.id);

    try {
      const geo = await getGeoSafe();
      await signDocument(
        pendingSignDoc.id,
        worker.id,
        worker.nombre,
        worker.rut,
        signatureDataUrl,
        geo ?? undefined
      );
      setPendingSignDoc(null);
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
            <span className="text-2xl">📎</span>
            <span>Documentos asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            Cargando documentos…
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
            <span className="text-2xl">📎</span>
            <span>Documentos asignados</span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No tienes documentos asignados por firmar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">📎</span>
          <span>Documentos asignados</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="art-list">
          {sorted.map((d) => {
            const assignment = d.asignados.find((a) => a.workerId === worker.id);
            const firmado = !!assignment?.firmadoEn;
            const pdfKey = assignment ? `${d.id}_${assignment.workerId}_${assignment.token}` : null;

            return (
              <div key={d.id} className="art-item">
                <div className="art-main">
                  <div className="art-date">{formatDate(d.fecha)}</div>

                  <div>
                    <strong>{d.titulo}</strong>
                    <div className="art-meta">{d.obra}</div>
                    {d.categoria && <div className="art-meta">Categoría: {d.categoria}</div>}
                    <div className="art-meta">Archivo: {d.attachment.fileName}</div>
                    {firmado && assignment?.firmadoEn && (
                      <div className="art-meta">Firmado: {formatDateTime(assignment.firmadoEn)}</div>
                    )}
                  </div>
                </div>

                {firmado ? (
                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    <span className="art-status">Firmado</span>
                    {assignment && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={downloadingKey === pdfKey}
                        onClick={async () => {
                          if (!assignment) return;
                          setError("");
                          setDownloadingKey(pdfKey);
                          try {
                            const rec = await getSignedDocumentPdfByKey({
                              documentId: d.id,
                              workerId: assignment.workerId,
                              token: assignment.token,
                            });
                            if (!rec) {
                              throw new Error("No se encontró el PDF firmado");
                            }
                            downloadBlobAsFile(rec.pdf, rec.fileName);
                          } catch (e) {
                            const msg = e instanceof Error ? e.message : "No se pudo descargar";
                            setError(msg);
                          } finally {
                            setDownloadingKey(null);
                          }
                        }}
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                      >
                        {downloadingKey === pdfKey ? "Descargando..." : "Descargar PDF"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => downloadBlobAsFile(d.attachment.blob, d.attachment.fileName)}
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                    >
                      Ver archivo
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleOpenSign(d)}
                      disabled={signingId === d.id}
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                    >
                      {signingId === d.id ? "Firmando..." : "Firmar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SignatureModal
        open={!!pendingSignDoc}
        title="Firma de documento"
        subtitle={
          pendingSignDoc
            ? `${pendingSignDoc.titulo} · ${pendingSignDoc.obra} · ${formatDate(pendingSignDoc.fecha)}`
            : undefined
        }
        onCancel={() => {
          if (signingId) return;
          setPendingSignDoc(null);
        }}
        onConfirm={handleConfirmSign}
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
