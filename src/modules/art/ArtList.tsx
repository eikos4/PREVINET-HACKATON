import { useEffect, useState } from "react";
import { getARTs } from "./art.service";
import type { ART } from "./art.service";
import { downloadBlobAsFile, getSignedArtPdfByKey } from "./artPdf.service";

export default function ArtList() {
  const [arts, setArts] = useState<ART[]>([]);
  const [downloadError, setDownloadError] = useState<string>("");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [expandedArtIds, setExpandedArtIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    getARTs().then(setArts);
  }, []);

  const sorted = [...arts].sort((a, b) => {
    try {
      return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
    } catch {
      return 0;
    }
  });

  if (sorted.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">📝</span>
              <span>ART/AST publicados</span>
            </h3>
          </div>

          <div className="p-12 text-center">
            <p className="text-gray-400 text-base m-0">No hay ART/AST publicados aún.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">📝</span>
              <span>ART/AST publicados</span>
            </h3>
            <span className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              {sorted.length} documentos
            </span>
          </div>
        </div>

        <div className="p-6">
          {downloadError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-red-700 text-sm font-medium m-0">⚠️ {downloadError}</p>
            </div>
          )}

          <div className="space-y-4">
            {sorted.map((a) => {
              const assignments = a.asignados ?? [];
              const total = assignments.length > 0 ? assignments.length : a.trabajadores.length;
              const firmados = assignments.filter((x) => !!x.firmadoEn).length;
              const pendientes = total - firmados;
              const porcentaje = total > 0 ? Math.round((firmados / total) * 100) : 0;

              const signedAssignments = assignments.filter((x) => !!x.firmadoEn);
              const isExpanded = expandedArtIds.has(a.id);

              return (
                <div
                  key={a.id}
                  className="border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <button
                    onClick={() => {
                      setExpandedArtIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setExpandedArtIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      });
                    }}
                    className="w-full p-6 text-left hover:bg-gray-50/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{a.obra}</span>
                          <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                            {a.cerrado ? "CERRADO" : "ABIERTO"}
                          </span>
                        </div>

                        {a.attachment?.fileName && (
                          <p className="text-sm text-gray-600 mb-3 m-0">
                            Documento: <span className="font-medium">{a.attachment.fileName}</span>
                          </p>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs text-gray-500 font-medium">{formatDate(a.fecha)}</span>
                          <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{porcentaje}%</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-600 m-0 font-medium">Asignados</p>
                            <p className="text-lg font-bold text-gray-900 m-0">{total}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-green-700 m-0 font-medium">Firmados</p>
                            <p className="text-lg font-bold text-green-700 m-0">{firmados}</p>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-yellow-700 m-0 font-medium">Pendientes</p>
                            <p className="text-lg font-bold text-yellow-700 m-0">{pendientes}</p>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          {signedAssignments.length > 0 ? (
                            <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                              {signedAssignments.length} PDF{signedAssignments.length !== 1 ? "s" : ""} firmado{signedAssignments.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin firmas todavía</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-blue-600 text-xl">{isExpanded ? "▼" : "▶"}</div>
                    </div>
                  </button>

                  {isExpanded && signedAssignments.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                      <h5 className="text-sm font-bold text-gray-900 mb-4 m-0">📝 Firmas Registradas</h5>

                      {a.attachment?.blob && a.attachment.fileName && (
                        <div className="mb-4">
                          <button
                            type="button"
                            className="bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            onClick={() => downloadBlobAsFile(a.attachment!.blob, a.attachment!.fileName)}
                          >
                            Descargar archivo original
                          </button>
                        </div>
                      )}

                      <div className="space-y-3">
                        {signedAssignments.map((x) => {
                          const name = x.firmadoPorNombre ?? "(sin nombre)";
                          const rut = x.firmadoPorRut ?? "";
                          const when = x.firmadoEn ? formatDateTime(x.firmadoEn) : "";
                          const key = `${a.id}_${x.workerId}_${x.token}`;

                          return (
                            <div
                              key={key}
                              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900 m-0">
                                  {name}{rut ? ` (${rut})` : ""}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 m-0">{when}</p>
                              </div>
                              <button
                                type="button"
                                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                disabled={downloadingKey === key}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDownloadError("");
                                  setDownloadingKey(key);
                                  try {
                                    const rec = await getSignedArtPdfByKey({
                                      artId: a.id,
                                      workerId: x.workerId,
                                      token: x.token,
                                    });

                                    if (!rec) {
                                      throw new Error("No se encontró el PDF firmado para este trabajador");
                                    }

                                    downloadBlobAsFile(rec.pdf, rec.fileName);
                                  } catch (e) {
                                    const msg = e instanceof Error ? e.message : "No se pudo descargar el PDF";
                                    setDownloadError(msg);
                                  } finally {
                                    setDownloadingKey(null);
                                  }
                                }}
                              >
                                {downloadingKey === key ? "Descargando…" : "Descargar PDF"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- HELPERS ---------- */

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
