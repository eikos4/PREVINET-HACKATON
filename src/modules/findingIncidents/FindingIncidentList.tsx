import { useEffect, useMemo, useState } from "react";
import {
  addFindingIncidentEvidences,
  addFindingIncidentFollowUp,
  getFindingIncidents,
  updateFindingIncidentStatus,
  type FindingIncident,
  type FindingIncidentStatus,
  type FindingIncidentType,
} from "./findingIncident.service";

function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function FindingIncidentList({
  readOnly,
  currentUserId,
  reloadKey,
}: {
  readOnly: boolean;
  currentUserId?: string;
  reloadKey: number;
}) {
  const [items, setItems] = useState<FindingIncident[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [filterTipo, setFilterTipo] = useState<"" | FindingIncidentType>("");
  const [filterEstado, setFilterEstado] = useState<"" | FindingIncidentStatus>("");
  const [q, setQ] = useState("");

  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getFindingIncidents().then(setItems);
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...items]
      .filter((x) => (filterTipo ? x.tipo === filterTipo : true))
      .filter((x) => (filterEstado ? x.estado === filterEstado : true))
      .filter((x) => {
        if (!query) return true;
        const hay = [x.obra, x.lugar, x.descripcion, x.responsable, x.recomendacion]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => {
        try {
          return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
        } catch {
          return 0;
        }
      });
  }, [items, filterTipo, filterEstado, q]);

  const onToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onChangeStatus = async (id: string, estado: FindingIncidentStatus) => {
    setError("");
    setBusyId(id);
    try {
      await updateFindingIncidentStatus(id, estado);
      setItems(await getFindingIncidents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar estado");
    } finally {
      setBusyId(null);
    }
  };

  const onAddFollowUp = async (id: string, texto: string) => {
    setError("");
    setBusyId(id);
    try {
      await addFindingIncidentFollowUp(id, texto, currentUserId);
      setItems(await getFindingIncidents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar seguimiento");
    } finally {
      setBusyId(null);
    }
  };

  const onAddEvidences = async (id: string, files: File[]) => {
    if (files.length === 0) return;
    setError("");
    setBusyId(id);
    try {
      await addFindingIncidentEvidences(id, files);
      setItems(await getFindingIncidents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo adjuntar evidencia");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 m-0">
              <span className="text-3xl">🧱</span>
              <span>Hallazgos e incidencias</span>
            </h3>
            <span className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              {filtered.length} registros
            </span>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p className="text-red-700 text-sm font-medium m-0">⚠️ {error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Buscar por obra/lugar/descripcion…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as any)}
            >
              <option value="">Todos los tipos</option>
              <option value="HALLAZGO">Hallazgo</option>
              <option value="INCIDENCIA">Incidencia</option>
            </select>

            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
            >
              <option value="">Todos los estados</option>
              <option value="ABIERTO">ABIERTO</option>
              <option value="EN_PROCESO">EN PROCESO</option>
              <option value="CERRADO">CERRADO</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-base m-0">No hay registros aún.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((x) => {
                const expanded = expandedIds.has(x.id);
                const badgeColor =
                  x.estado === "CERRADO"
                    ? "bg-emerald-100 text-emerald-700"
                    : x.estado === "EN_PROCESO"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700";

                return (
                  <div
                    key={x.id}
                    className="border border-gray-200 rounded-xl bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200"
                  >
                    <button
                      className="w-full p-6 text-left hover:bg-gray-50/60 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset"
                      onClick={() => onToggleExpand(x.id)}
                    >
                      <div className="flex items-start gap-4 justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              {x.tipo === "HALLAZGO" ? "Hallazgo" : "Incidencia"}
                            </span>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                              {x.estado}
                            </span>
                            <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {x.obra}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2 m-0">{x.lugar}</p>
                          <p className="text-sm text-gray-900 m-0 line-clamp-2">{x.descripcion}</p>

                          <div className="mt-3 text-xs text-gray-500">
                            {formatDate(x.fecha)}{x.hora ? ` · ${x.hora}` : ""}
                            {x.creadoEn ? ` · creado ${formatDateTime(x.creadoEn)}` : ""}
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-slate-700 text-xl">
                          {expanded ? "▼" : "▶"}
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">Detalles</div>
                            <div className="text-sm text-gray-700">
                              <div><strong>Obra:</strong> {x.obra}</div>
                              <div><strong>Lugar:</strong> {x.lugar}</div>
                              <div><strong>Fecha:</strong> {formatDate(x.fecha)}{x.hora ? ` ${x.hora}` : ""}</div>
                              <div style={{ marginTop: "0.5rem" }}><strong>Descripción:</strong> {x.descripcion}</div>
                            </div>
                          </div>

                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">Información específica</div>
                            {x.tipo === "HALLAZGO" ? (
                              <div className="text-sm text-gray-700">
                                <div><strong>Riesgo potencial:</strong> {x.riesgoPotencial ?? "-"}</div>
                                <div><strong>Responsable:</strong> {x.responsable ?? "-"}</div>
                                <div><strong>Recomendación:</strong> {x.recomendacion ?? "-"}</div>
                                <div><strong>Plazo:</strong> {x.plazoResolver ?? "-"}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-700">
                                <div><strong>Involucrados:</strong> {x.personasInvolucradas ?? "-"}</div>
                                <div><strong>Consecuencias:</strong> {x.consecuencias ?? "-"}</div>
                                <div><strong>Causas probables:</strong> {x.causasProbables ?? "-"}</div>
                                <div><strong>Medidas inmediatas:</strong> {x.medidasInmediatas ?? "-"}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold text-gray-900">Evidencias</div>
                            {!readOnly && (
                              <label className="text-sm font-medium text-slate-700">
                                <input
                                  type="file"
                                  multiple
                                  className="text-sm"
                                  onChange={(e) =>
                                    onAddEvidences(x.id, Array.from(e.target.files ?? []))
                                  }
                                  disabled={busyId === x.id}
                                />
                              </label>
                            )}
                          </div>

                          {(x.evidencias ?? []).length === 0 ? (
                            <div className="text-sm text-gray-500 mt-2">Sin evidencias.</div>
                          ) : (
                            <div className="mt-3 grid gap-2">
                              {(x.evidencias ?? []).map((ev) => (
                                <div
                                  key={ev.id}
                                  className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
                                >
                                  <div className="text-sm text-gray-800 truncate">
                                    {ev.fileName}
                                  </div>
                                  <button
                                    type="button"
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                                    onClick={() => downloadBlobAsFile(ev.blob, ev.fileName)}
                                  >
                                    Descargar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">Seguimiento</div>

                            {(x.seguimiento ?? []).length === 0 ? (
                              <div className="text-sm text-gray-500">Sin seguimiento.</div>
                            ) : (
                              <div className="grid gap-2">
                                {(x.seguimiento ?? []).map((s) => (
                                  <div
                                    key={s.id}
                                    className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                                  >
                                    <div className="text-sm text-gray-900">{s.texto}</div>
                                    <div className="text-xs text-gray-500 mt-1">{formatDateTime(s.creadoEn)}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!readOnly && (
                              <FollowUpComposer
                                disabled={busyId === x.id}
                                onSubmit={(texto) => onAddFollowUp(x.id, texto)}
                              />
                            )}
                          </div>

                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">Estado</div>

                            <div className="text-sm text-gray-700 mb-3">
                              Estado actual: <strong>{x.estado}</strong>
                            </div>

                            {!readOnly && (
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                                  disabled={busyId === x.id}
                                  onClick={() => onChangeStatus(x.id, "ABIERTO")}
                                >
                                  ABIERTO
                                </button>
                                <button
                                  type="button"
                                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                                  disabled={busyId === x.id}
                                  onClick={() => onChangeStatus(x.id, "EN_PROCESO")}
                                >
                                  EN PROCESO
                                </button>
                                <button
                                  type="button"
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-semibold"
                                  disabled={busyId === x.id}
                                  onClick={() => onChangeStatus(x.id, "CERRADO")}
                                >
                                  CERRAR
                                </button>
                              </div>
                            )}

                            {x.cerradoEn && (
                              <div className="text-xs text-gray-500 mt-3">
                                Cerrado: {formatDateTime(x.cerradoEn)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowUpComposer({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (texto: string) => void;
}) {
  const [texto, setTexto] = useState("");

  return (
    <div className="mt-3">
      <textarea
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        placeholder="Agregar comentario de seguimiento…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={disabled}
      />
      <div className="flex justify-end mt-2">
        <button
          type="button"
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          disabled={disabled}
          onClick={() => {
            const value = texto.trim();
            if (!value) return;
            onSubmit(value);
            setTexto("");
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatDateTime(date: string | Date) {
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return String(date);
  }
}
