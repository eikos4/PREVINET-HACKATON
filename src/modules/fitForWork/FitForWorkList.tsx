import { useEffect, useMemo, useState } from "react";
import { getFitForWork } from "./fitForWork.service";
import type { FitForWork } from "./fitForWork.service";
import { downloadBlobAsFile, getSignedFitForWorkPdfByKey } from "./fitForWorkPdf.service";

export default function FitForWorkList() {
  const [evaluations, setEvaluations] = useState<FitForWork[]>([]);
  const [downloadError, setDownloadError] = useState<string>("");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    getFitForWork().then(setEvaluations);
  }, []);

  const sorted = useMemo(() => {
    return [...evaluations].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [evaluations]);

  if (sorted.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">✅</span>
              <span>Evaluaciones Fit-for-Work</span>
            </h3>
          </div>

          <div className="p-12 text-center">
            <p className="text-gray-400 text-base m-0">No hay evaluaciones publicadas aún.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">✅</span>
              <span>Evaluaciones Fit-for-Work</span>
            </h3>
            <span className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              {sorted.length} evaluaciones
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
            {sorted.map((e) => {
              const total = e.asignados.length;
              const completados = e.asignados.filter((a) => !!a.firmadoEn).length;
              const aptos = e.asignados.filter((a) => a.apto === true).length;
              const noAptos = e.asignados.filter((a) => a.apto === false).length;
              const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

              const completedAssignments = e.asignados.filter((a) => !!a.firmadoEn);
              const isExpanded = expandedIds.has(e.id);

              return (
                <div
                  key={e.id}
                  className="border border-gray-200 rounded-xl bg-white hover:border-green-300 hover:shadow-md transition-all duration-200"
                >
                  <button
                    onClick={() => {
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(e.id)) next.delete(e.id);
                        else next.add(e.id);
                        return next;
                      });
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key !== "Enter" && ev.key !== " ") return;
                      ev.preventDefault();
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(e.id)) next.delete(e.id);
                        else next.add(e.id);
                        return next;
                      });
                    }}
                    className="w-full p-6 text-left hover:bg-gray-50/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset"
                  >
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">
                            {formatDate(e.fecha)} - {e.turno.toUpperCase()}
                          </span>
                          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                            {e.estado}
                          </span>
                        </div>

                        {e.obra && (
                          <p className="text-sm text-gray-600 mb-3 m-0">Obra: {e.obra}</p>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{porcentaje}%</span>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-600 m-0 font-medium">Asignados</p>
                            <p className="text-lg font-bold text-gray-900 m-0">{total}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-blue-700 m-0 font-medium">Completados</p>
                            <p className="text-lg font-bold text-blue-700 m-0">{completados}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-green-700 m-0 font-medium">Aptos</p>
                            <p className="text-lg font-bold text-green-700 m-0">{aptos}</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-red-700 m-0 font-medium">No Aptos</p>
                            <p className="text-lg font-bold text-red-700 m-0">{noAptos}</p>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          {completedAssignments.length > 0 ? (
                            <span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                              {completedAssignments.length} PDF{completedAssignments.length !== 1 ? "s" : ""} firmado
                              {completedAssignments.length !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin evaluaciones completadas</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-green-600 text-xl">{isExpanded ? "▼" : "▶"}</div>
                    </div>
                  </button>

                  {isExpanded && completedAssignments.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                      <h5 className="text-sm font-bold text-gray-900 mb-4 m-0">📝 Evaluaciones Completadas</h5>

                      <div className="space-y-3">
                        {completedAssignments.map((a) => {
                          const name = a.firmadoPorNombre ?? "(sin nombre)";
                          const rut = a.firmadoPorRut ?? "";
                          const when = a.firmadoEn ? formatDateTime(a.firmadoEn) : "";
                          const apto = a.apto ?? false;
                          const key = `${e.id}_${a.workerId}_${a.token}`;

                          return (
                            <div
                              key={key}
                              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-green-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 m-0">
                                  {name}
                                  {rut ? ` (${rut})` : ""}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 m-0">{when}</p>
                                <div className="mt-2">
                                  {apto ? (
                                    <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                                      ✓ APTO PARA TRABAJAR
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                                      ✗ NO APTO PARA TRABAJAR
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="flex-shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                disabled={downloadingKey === key}
                                onClick={async (ev) => {
                                  ev.stopPropagation();
                                  setDownloadError("");
                                  setDownloadingKey(key);
                                  try {
                                    const rec = await getSignedFitForWorkPdfByKey({
                                      fitForWorkId: e.id,
                                      workerId: a.workerId,
                                      token: a.token,
                                    });

                                    if (!rec) {
                                      throw new Error("No se encontró el PDF firmado para este trabajador");
                                    }

                                    downloadBlobAsFile(rec.pdf, rec.fileName);
                                  } catch (err) {
                                    const msg = err instanceof Error ? err.message : "No se pudo descargar el PDF";
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
