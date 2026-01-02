import { useEffect, useMemo, useState } from "react";

import { getWorkersForPrevencionista, getWorkerTimeline } from "./prevencionista.service";
import type { Worker } from "../workers/worker.service";
import type { WorkerActivity, WorkerTimelineData } from "./prevencionista.service";
import {
  downloadBlobAsFile,
  getSignedDocumentPdfByKey,
} from "../documents/documentsPdf.service";

function typeLabel(type: WorkerActivity["type"]) {
  switch (type) {
    case "document":
      return "Documento";
    case "irl":
      return "IRL";
    case "talk":
      return "Charla";
    case "fitForWork":
      return "Fit-for-Work";
    case "art":
      return "ART/AST";
    case "findingIncident":
      return "Hallazgo/Incidencia";
    default:
      return "Actividad";
  }
}

function typeIcon(type: WorkerActivity["type"]) {
  switch (type) {
    case "document":
      return "📄";
    case "irl":
      return "🧾";
    case "talk":
      return "🗣️";
    case "fitForWork":
      return "✅";
    case "art":
      return "📝";
    case "findingIncident":
      return "🧱";
    default:
      return "•";
  }
}

function formatDate(d: Date) {
  const t = d.getTime();
  if (Number.isNaN(t)) return "(sin fecha)";
  return d.toLocaleString("es-CL");
}

function formatOptionalDate(d: Date | undefined) {
  if (!d) return "(sin fecha)";
  const t = d.getTime();
  if (Number.isNaN(t)) return "(sin fecha)";
  return d.toLocaleString("es-CL");
}

export default function PrevencionistaTimelineView() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "activities" | "signatures">(
    "activities"
  );

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [timeline, setTimeline] = useState<WorkerTimelineData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    setLoadingWorkers(true);
    setError("");

    getWorkersForPrevencionista()
      .then((list) => {
        if (!mounted) return;
        setWorkers(list);
        if (!selectedWorkerId && list.length > 0) {
          setSelectedWorkerId(list[0].id);
        }
      })
      .catch((e) => {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : "No se pudieron cargar los trabajadores";
        setError(msg);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingWorkers(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkerId) return;

    let mounted = true;
    setLoadingTimeline(true);
    setError("");

    getWorkerTimeline(selectedWorkerId)
      .then((data) => {
        if (!mounted) return;
        setTimeline(data);
      })
      .catch((e) => {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : "No se pudo cargar la línea de tiempo";
        setError(msg);
        setTimeline(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingTimeline(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedWorkerId]);

  const grouped = useMemo(() => {
    const list = timeline?.activities ?? [];
    const byDay = new Map<string, WorkerActivity[]>();

    list.forEach((a) => {
      const d = a.date instanceof Date ? a.date : new Date(a.date);
      const key = Number.isNaN(d.getTime())
        ? "Sin fecha"
        : d.toLocaleDateString("es-CL");
      const arr = byDay.get(key) ?? [];
      arr.push(a);
      byDay.set(key, arr);
    });

    // Mantener el orden del array original (ya viene ordenado desc)
    return Array.from(byDay.entries());
  }, [timeline]);

  const signatureSummary = useMemo(() => {
    if (!timeline) return null;

    const workerId = timeline.worker.id;

    const docsSigned = timeline.documents.filter((d) =>
      d.asignados?.some((a) => a.workerId === workerId && !!a.firmadoEn)
    ).length;
    const irlSigned = timeline.irls.filter((i) =>
      i.asignados?.some((a) => a.workerId === workerId && !!a.firmadoEn)
    ).length;
    const talksSigned = timeline.talks.filter((t) =>
      t.asignados?.some((a) => a.workerId === workerId && !!a.firmadoEn)
    ).length;
    const ffwSigned = timeline.fitForWork.filter((f) =>
      f.asignados?.some((a) => a.workerId === workerId && !!a.firmadoEn)
    ).length;
    const artSigned = timeline.arts.filter((a) =>
      a.asignados?.some((x) => x.workerId === workerId && !!x.firmadoEn)
    ).length;

    const enrollmentSigned = !!timeline.worker.enrolamientoFirmadoEn;

    return {
      enrollmentSigned,
      docs: { signed: docsSigned, total: timeline.documents.length },
      irls: { signed: irlSigned, total: timeline.irls.length },
      talks: { signed: talksSigned, total: timeline.talks.length },
      fitForWork: { signed: ffwSigned, total: timeline.fitForWork.length },
      art: { signed: artSigned, total: timeline.arts.length },
    };
  }, [timeline]);

  const signatureEvents = useMemo(() => {
    if (!timeline) return [] as Array<{ id: string; label: string; when?: Date; extra?: string }>;
    const workerId = timeline.worker.id;
    const events: Array<{ id: string; label: string; when?: Date; extra?: string }> = [];

    if (timeline.worker.enrolamientoFirmadoEn) {
      events.push({
        id: `enrolamiento-${workerId}`,
        label: "Enrolamiento trabajador",
        when: timeline.worker.enrolamientoFirmadoEn,
      });
    }

    timeline.documents.forEach((d) => {
      const a = d.asignados?.find((x) => x.workerId === workerId);
      if (a?.firmadoEn) {
        events.push({
          id: `doc-${d.id}`,
          label: `Documento: ${d.titulo}`,
          when: a.firmadoEn,
          extra: a.geo ? `Geo: ${a.geo.lat.toFixed(5)}, ${a.geo.lng.toFixed(5)}` : undefined,
        });
      }
    });

    timeline.irls.forEach((i) => {
      const a = i.asignados?.find((x) => x.workerId === workerId);
      if (a?.firmadoEn) {
        events.push({
          id: `irl-${i.id}`,
          label: `IRL: ${i.titulo}`,
          when: a.firmadoEn,
          extra: a.geo ? `Geo: ${a.geo.lat.toFixed(5)}, ${a.geo.lng.toFixed(5)}` : undefined,
        });
      }
    });

    timeline.talks.forEach((t) => {
      const a = t.asignados?.find((x) => x.workerId === workerId);
      if (a?.firmadoEn) {
        events.push({
          id: `talk-${t.id}`,
          label: `Charla: ${t.tema}`,
          when: a.firmadoEn,
          extra: a.geo ? `Geo: ${a.geo.lat.toFixed(5)}, ${a.geo.lng.toFixed(5)}` : undefined,
        });
      }
    });

    timeline.fitForWork.forEach((f) => {
      const a = f.asignados?.find((x) => x.workerId === workerId);
      if (a?.firmadoEn) {
        events.push({
          id: `ffw-${f.id}`,
          label: `Fit-for-Work (${f.turno})${a.apto === true ? " (Apto)" : a.apto === false ? " (No apto)" : ""}`,
          when: a.firmadoEn,
          extra: a.geo ? `Geo: ${a.geo.lat.toFixed(5)}, ${a.geo.lng.toFixed(5)}` : undefined,
        });
      }
    });

    timeline.arts.forEach((art) => {
      const a = art.asignados?.find((x) => x.workerId === workerId);
      if (a?.firmadoEn) {
        events.push({
          id: `art-${art.id}`,
          label: `ART/AST: ${art.obra}`,
          when: a.firmadoEn,
          extra: a.geo ? `Geo: ${a.geo.lat.toFixed(5)}, ${a.geo.lng.toFixed(5)}` : undefined,
        });
      }
    });

    events.sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0));
    return events;
  }, [timeline]);

  const tabClass = (key: typeof activeTab) => {
    const base = "px-4 py-2 text-sm font-semibold rounded-lg transition-colors";
    if (activeTab === key) {
      return `${base} bg-blue-600 text-white`;
    }
    return `${base} bg-white text-slate-700 border border-slate-200 hover:bg-slate-50`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-white m-0">Ficha del trabajador</h2>
            <p className="text-blue-100 text-sm m-0 mt-1">
              Vista consolidada (info, documentos, actividades, firmas)
            </p>
          </div>

          <div className="min-w-[280px]">
            <label className="block text-sm font-semibold text-white/95 mb-2">Trabajador</label>
            <select
              className="w-full rounded-lg border border-blue-200/30 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              disabled={loadingWorkers || workers.length === 0}
            >
              {workers.length === 0 ? (
                <option value="">(Sin trabajadores)</option>
              ) : (
                workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre} · {w.rut} · {w.obra}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">

        {error && (
          <p className="text-red-600 font-semibold mt-0 mb-4">{error}</p>
        )}

        {loadingWorkers && (
          <p className="text-sm text-slate-500 m-0">Cargando trabajadores...</p>
        )}

        {loadingTimeline && (
          <p className="text-sm text-slate-500 m-0">Cargando información...</p>
        )}

        {!loadingTimeline && timeline && (
          <div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
              <div className="font-semibold text-slate-900">{timeline.worker.nombre}</div>
              <div className="text-sm text-slate-600 mt-1">
                {timeline.worker.rut} · {timeline.worker.cargo} · {timeline.worker.obra}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
            <button
              type="button"
              className={tabClass("info")}
              onClick={() => setActiveTab("info")}
            >
              Info
            </button>
            <button
              type="button"
              className={tabClass("documents")}
              onClick={() => setActiveTab("documents")}
            >
              Documentos
            </button>
            <button
              type="button"
              className={tabClass("activities")}
              onClick={() => setActiveTab("activities")}
            >
              Actividades
            </button>
            <button
              type="button"
              className={tabClass("signatures")}
              onClick={() => setActiveTab("signatures")}
            >
              Firmas
            </button>
            </div>

          {activeTab === "info" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="grid gap-2 text-sm">
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Nombre:</span><span className="text-slate-700">{timeline.worker.nombre}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">RUT:</span><span className="text-slate-700">{timeline.worker.rut}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Cargo:</span><span className="text-slate-700">{timeline.worker.cargo}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Obra:</span><span className="text-slate-700">{timeline.worker.obra}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Empresa:</span><span className="text-slate-700">{timeline.worker.empresaNombre} {timeline.worker.empresaRut ? `(${timeline.worker.empresaRut})` : ""}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Teléfono:</span><span className="text-slate-700">{timeline.worker.telefono || "(sin teléfono)"}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Habilitado:</span><span className="text-slate-700">{timeline.worker.habilitado ? "Sí" : "No"}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Enrolamiento firmado:</span><span className="text-slate-700">{formatOptionalDate(timeline.worker.enrolamientoFirmadoEn)}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Adjunto IRL:</span><span className="text-slate-700">{timeline.worker.irlAdjunto?.fileName ? timeline.worker.irlAdjunto.fileName : "(sin adjunto)"}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-slate-900">Adjunto Aptitud:</span><span className="text-slate-700">{timeline.worker.aptitudAdjunto?.fileName ? timeline.worker.aptitudAdjunto.fileName : "(sin adjunto)"}</span></div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div>
              {timeline.documents.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">
                  No hay documentos asignados.
                </p>
              ) : (
                <div className="grid gap-3">
                  {timeline.documents.map((d) => {
                    const a = d.asignados?.find((x) => x.workerId === timeline.worker.id);
                    const signed = !!a?.firmadoEn;
                    const pdfKey = a ? `${d.id}_${a.workerId}_${a.token}` : null;
                    return (
                      <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 truncate">{d.titulo}</div>
                              <span
                                className={
                                  signed
                                    ? "inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700"
                                    : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
                                }
                              >
                                {signed ? "Firmado" : "Pendiente"}
                              </span>
                            </div>

                            <div className="text-sm text-slate-600 mt-1">
                              {d.categoria ? `${d.categoria} · ` : ""}{d.obra}
                            </div>

                            {d.descripcion && (
                              <div className="text-sm text-slate-700 mt-2">{d.descripcion}</div>
                            )}

                            <div className="text-xs text-slate-500 mt-2">
                              Fecha doc: {d.fecha || "(sin fecha)"} · Creado: {formatOptionalDate(d.creadoEn)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Archivo: {d.attachment?.fileName || "(sin archivo)"}
                            </div>

                            {signed && a?.firmadoEn && (
                              <div className="text-xs text-slate-500 mt-1">
                                Firmado: {formatOptionalDate(a.firmadoEn)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {d.attachment?.blob && d.attachment.fileName && (
                              <button
                                type="button"
                                className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                onClick={() => downloadBlobAsFile(d.attachment.blob, d.attachment.fileName)}
                              >
                                Ver archivo
                              </button>
                            )}

                            {signed && a && pdfKey && (
                              <button
                                type="button"
                                className="px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                disabled={downloadingKey === pdfKey}
                                onClick={async () => {
                                  setError("");
                                  setDownloadingKey(pdfKey);
                                  try {
                                    const rec = await getSignedDocumentPdfByKey({
                                      documentId: d.id,
                                      workerId: a.workerId,
                                      token: a.token,
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
                              >
                                {downloadingKey === pdfKey ? "Descargando..." : "PDF firmado"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "activities" && (
            <div>
              {timeline.activities.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">
                  No hay actividades registradas para este trabajador.
                </p>
              ) : (
                <div className="grid gap-4">
                  {grouped.map(([day, items]) => (
                    <div key={day}>
                      <div className="font-semibold text-slate-900 mb-2">{day}</div>

                      <div className="grid gap-3">
                        {items.map((a) => (
                          <div
                            key={`${a.type}-${a.id}`}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex gap-3">
                              <div className="text-xl leading-none">{typeIcon(a.type)}</div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold text-slate-900">{a.title}</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                      {typeLabel(a.type)}
                                      {a.status ? ` · ${a.status}` : ""}
                                    </div>
                                  </div>

                                  <div className="text-sm text-slate-500 whitespace-nowrap">
                                    {formatDate(a.date)}
                                  </div>
                                </div>

                                <div className="text-sm text-slate-800 mt-2">
                                  {a.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "signatures" && (
            <div>
              {signatureSummary && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">Enrolamiento:</span><span className="text-slate-700">{signatureSummary.enrollmentSigned ? "Firmado" : "Pendiente"}</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">Documentos:</span><span className="text-slate-700">{signatureSummary.docs.signed}/{signatureSummary.docs.total} firmados</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">IRL:</span><span className="text-slate-700">{signatureSummary.irls.signed}/{signatureSummary.irls.total} firmados</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">Charlas:</span><span className="text-slate-700">{signatureSummary.talks.signed}/{signatureSummary.talks.total} firmadas</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">Fit-for-Work:</span><span className="text-slate-700">{signatureSummary.fitForWork.signed}/{signatureSummary.fitForWork.total} firmados</span></div>
                    <div className="flex gap-2"><span className="font-semibold text-slate-900">ART/AST:</span><span className="text-slate-700">{signatureSummary.art.signed}/{signatureSummary.art.total} firmados</span></div>
                  </div>
                </div>
              )}

              {signatureEvents.length === 0 ? (
                <p className="text-sm text-slate-500 m-0">
                  No hay firmas registradas para este trabajador.
                </p>
              ) : (
                <div className="grid gap-3">
                  {signatureEvents.map((e) => (
                    <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-semibold text-slate-900">{e.label}</div>
                        <div className="text-sm text-slate-500 whitespace-nowrap">{formatOptionalDate(e.when)}</div>
                      </div>
                      {e.extra && (
                        <div className="mt-2 text-sm text-slate-600">{e.extra}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
