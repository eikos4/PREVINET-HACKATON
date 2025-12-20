import { useEffect, useState } from "react";
import { getWorkers, setWorkerHabilitado } from "./worker.service";
import type { Worker } from "./worker.service";
import {
  downloadBlobAsFile,
  getSignedWorkerEnrollmentPdfByKey,
} from "./workerEnrollmentPdf.service";

export default function WorkerList({ readOnly = false }: { readOnly?: boolean }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = () => {
    getWorkers().then(setWorkers);
  };

  const downloadEnrollmentPdf = async (w: Worker) => {
    if (!w.enrolamientoToken) return;
    setError("");
    setDownloadingId(w.id);
    try {
      const rec = await getSignedWorkerEnrollmentPdfByKey({
        workerId: w.id,
        token: w.enrolamientoToken,
      });
      if (!rec) {
        setError("No se encontró el PDF firmado de enrolamiento");
        return;
      }
      downloadBlobAsFile(rec.pdf, rec.fileName);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo descargar";
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (workers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
            <span className="text-2xl">👥</span>
            <span>Trabajadores enrolados</span>
          </h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500" style={{ margin: 0 }}>
            No hay trabajadores enrolados aún.
          </p>
        </div>
      </div>
    );
  }

  const toggleHabilitado = async (w: Worker) => {
    setError("");
    setUpdatingId(w.id);
    try {
      await setWorkerHabilitado(w.id, !w.habilitado);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo actualizar el estado";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">👥</span>
          <span>Trabajadores enrolados</span>
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div className="worker-list">
          {workers.map((w) => (
            <div key={w.id} className="worker-item">
              <div className="worker-main">
                <div className="worker-avatar">
                  {w.nombre.charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{w.nombre}</strong>
                  <div className="worker-meta">
                    {w.rut} · {w.cargo} · {w.obra}
                  </div>
                  {w.telefono && <div className="worker-meta">Contacto: {w.telefono}</div>}
                  {(w.empresaNombre || w.empresaRut) && (
                    <div className="worker-meta">
                      {w.empresaNombre ?? ""}{w.empresaNombre && w.empresaRut ? " · " : ""}{w.empresaRut ?? ""}
                    </div>
                  )}
                  {w.enrolamientoFirmadoEn && (
                    <div className="worker-meta">
                      Enrolamiento firmado: {new Date(w.enrolamientoFirmadoEn).toLocaleString("es-CL")}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <span
                  className={`worker-status ${
                    w.habilitado ? "ok" : "warn"
                  }`}
                >
                  {w.habilitado ? "Habilitado" : "No habilitado"}
                </span>

                {w.irlAdjunto?.blob && w.irlAdjunto.fileName && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => downloadBlobAsFile(w.irlAdjunto!.blob, w.irlAdjunto!.fileName)}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                  >
                    IRL
                  </button>
                )}

                {w.aptitudAdjunto?.blob && w.aptitudAdjunto.fileName && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => downloadBlobAsFile(w.aptitudAdjunto!.blob, w.aptitudAdjunto!.fileName)}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                  >
                    Aptitud
                  </button>
                )}

                {w.enrolamientoToken && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => downloadEnrollmentPdf(w)}
                    disabled={downloadingId === w.id}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                  >
                    {downloadingId === w.id ? "Descargando..." : "PDF firmado"}
                  </button>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => toggleHabilitado(w)}
                    disabled={updatingId === w.id}
                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                  >
                    {updatingId === w.id
                      ? "Guardando..."
                      : w.habilitado
                        ? "Deshabilitar"
                        : "Habilitar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
