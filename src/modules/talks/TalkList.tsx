import { useEffect, useMemo, useState } from "react";
import { getTalks } from "./talk.service";
import type { Talk } from "./talk.service";
import { downloadBlobAsFile, getSignedTalkPdfByKey } from "./talkPdf.service";

export default function TalkList() {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [downloadError, setDownloadError] = useState<string>("");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [expandedTalkIds, setExpandedTalkIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    getTalks().then(setTalks);
  }, []);

  const sorted = useMemo(() => {
    return [...talks].sort((a, b) => {
      try {
        return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      } catch {
        return 0;
      }
    });
  }, [talks]);

  if (sorted.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">🗣️</span>
              <span>Charlas diarias</span>
            </h3>
          </div>

          <div className="p-12 text-center">
            <p className="text-gray-400 text-base m-0">No hay charlas publicadas aún.</p>
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
              <span className="text-3xl">🗣️</span>
              <span>Charlas diarias</span>
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
            {sorted.map((t) => {
              const total = t.asignados.length;
              const firmados = t.asignados.filter((a) => !!a.firmadoEn).length;
              const pendientes = total - firmados;
              const porcentaje = total > 0 ? Math.round((firmados / total) * 100) : 0;

              const signedAssignments = t.asignados.filter((a) => !!a.firmadoEn);
              const isExpanded = expandedTalkIds.has(t.id);

              return (
                <div
                  key={t.id}
                  className="border border-gray-200 rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <button
                    onClick={() => {
                      setExpandedTalkIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setExpandedTalkIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      });
                    }}
                    className="w-full p-6 text-left hover:bg-gray-50/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  >
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{t.tema}</span>
                          <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                            {t.estado}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 m-0">{formatDateTime(t.fechaHora)}</p>

                        <div className="flex items-center gap-3 mb-3">
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

                      <div className="space-y-3">
                        {signedAssignments.map((a) => {
                          const name = a.firmadoPorNombre ?? "(sin nombre)";
                          const rut = a.firmadoPorRut ?? "";
                          const when = a.firmadoEn ? formatDateTime(a.firmadoEn) : "";
                          const key = `${t.id}_${a.workerId}_${a.token}`;

                          return (
                            <div
                              key={key}
                              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
                            >
                              <div>
                                <p className="text-sm font-semibold text-gray-900 m-0">{name}{rut ? ` (${rut})` : ""}</p>
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
                                    const rec = await getSignedTalkPdfByKey({
                                      talkId: t.id,
                                      workerId: a.workerId,
                                      token: a.token,
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

function formatDateTime(date: string | Date) {
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return String(date);
  }
}
