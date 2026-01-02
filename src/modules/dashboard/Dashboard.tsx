import { useEffect, useState } from "react";
import { db } from "../../offline/db";

type Stats = {
  workers: number;
  workersHabilitados: number;
  artsHoy: number;
  artsPendientes: number;
  artAsignacionesHoy: number;
  artFirmadasHoy: number;
  reportesAbiertos: number;
  irlAsignaciones: number;
  irlFirmadas: number;
  talkAsignaciones: number;
  talkFirmadas: number;
  fitAsignacionesHoy: number;
  fitFirmadasHoy: number;
  fitNoAptoHoy: number;
  artPendientesDetalle: {
    artId: string;
    artObra: string;
    artFecha: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
  }[];
  irlPendientesDetalle: {
    irlId: string;
    irlTitulo: string;
    irlObra: string;
    irlFecha: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
  }[];
  talkPendientesDetalle: {
    talkId: string;
    talkTema: string;
    talkFechaHora: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
  }[];
  fitPendientesDetalle: {
    fitId: string;
    fitTurno: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
  }[];
  fitNoAptoDetalle: {
    fitId: string;
    fitTurno: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
    firmadoEn: Date;
  }[];
  pendientesPorTrabajador: {
    workerId: string;
    workerNombre: string;
    workerRut: string;
    pendingTotal: number;
    pendingART: number;
    pendingIRL: number;
    pendingTalk: number;
    pendingFit: number;
  }[];
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    workers: 0,
    workersHabilitados: 0,
    artsHoy: 0,
    artsPendientes: 0,
    artAsignacionesHoy: 0,
    artFirmadasHoy: 0,
    reportesAbiertos: 0,
    irlAsignaciones: 0,
    irlFirmadas: 0,
    talkAsignaciones: 0,
    talkFirmadas: 0,
    fitAsignacionesHoy: 0,
    fitFirmadasHoy: 0,
    fitNoAptoHoy: 0,
    artPendientesDetalle: [],
    irlPendientesDetalle: [],
    talkPendientesDetalle: [],
    fitPendientesDetalle: [],
    fitNoAptoDetalle: [],
    pendientesPorTrabajador: [],
  });

  const loadStats = async () => {
    const workersList = await db.table("workers").toArray();
    const workerById = new Map(workersList.map((w: any) => [w.id, w]));
    const workers = workersList.length;
    const workersHabilitados = workersList.filter((w: any) => w.habilitado !== false).length;

    const hoy = new Date().toISOString().slice(0, 10);

    const artsHoyList = await db
      .table("art")
      .filter((a: any) => a.fecha === hoy)
      .toArray();

    const artsHoy = artsHoyList.length;

    const artAsignacionesHoy = (artsHoyList as any[]).reduce((acc: number, a: any) => {
      const asignados = Array.isArray(a.asignados)
        ? a.asignados
        : Array.isArray(a.trabajadores)
          ? a.trabajadores.map((workerId: string) => ({ workerId }))
          : [];
      return acc + asignados.length;
    }, 0);

    const artFirmadasHoy = (artsHoyList as any[]).reduce((acc: number, a: any) => {
      const asignados = Array.isArray(a.asignados)
        ? a.asignados
        : Array.isArray(a.trabajadores)
          ? a.trabajadores.map((workerId: string) => ({ workerId }))
          : [];
      return acc + asignados.filter((x: any) => !!x.firmadoEn).length;
    }, 0);

    const artPendientesAll = (artsHoyList as any[])
      .flatMap((a: any) => {
        const asignados = Array.isArray(a.asignados)
          ? a.asignados
          : Array.isArray(a.trabajadores)
            ? a.trabajadores.map((workerId: string) => ({ workerId }))
            : [];

        return asignados
          .filter((x: any) => !x.firmadoEn)
          .map((x: any) => {
            const w = workerById.get(x.workerId);
            return {
              artId: a.id,
              artObra: a.obra,
              artFecha: a.fecha,
              workerId: x.workerId,
              workerNombre: w?.nombre ?? "(sin nombre)",
              workerRut: w?.rut ?? "",
            };
          });
      });

    const artPendientesDetalle = artPendientesAll.slice(0, 10);
    const artsPendientes = artPendientesAll.length;

    const reportesAbiertos = await db
      .table("reports")
      .filter((r: any) => r.estado === "REPORTADO")
      .count();

    const irls = await db.table("irl").toArray();
    const talks = await db.table("talks").toArray();
    const fitsHoy = await db
      .table("fitForWork")
      .filter((f: any) => f.fecha === hoy)
      .toArray();

    const irlAsignaciones = irls.reduce(
      (acc: number, i: any) => acc + (i.asignados?.length ?? 0),
      0
    );
    const irlFirmadas = irls.reduce(
      (acc: number, i: any) =>
        acc + (i.asignados?.filter((a: any) => !!a.firmadoEn)?.length ?? 0),
      0
    );

    const irlPendientesAll = irls.flatMap((i: any) => {
      const asignados = Array.isArray(i.asignados) ? i.asignados : [];
      return asignados
        .filter((a: any) => !a.firmadoEn)
        .map((a: any) => {
          const w = workerById.get(a.workerId);
          return {
            irlId: i.id,
            irlTitulo: i.titulo,
            irlObra: i.obra,
            irlFecha: i.fecha,
            workerId: a.workerId,
            workerNombre: w?.nombre ?? "(sin nombre)",
            workerRut: w?.rut ?? "",
          };
        });
    });

    const irlPendientesDetalle = irlPendientesAll.slice(0, 10);

    const talkAsignaciones = (talks as any[]).reduce(
      (acc: number, t: any) => acc + (t.asignados?.length ?? 0),
      0
    );
    const talkFirmadas = (talks as any[]).reduce(
      (acc: number, t: any) =>
        acc + (t.asignados?.filter((a: any) => !!a.firmadoEn)?.length ?? 0),
      0
    );

    const talkPendientesAll = (talks as any[]).flatMap((t: any) => {
      const asignados = Array.isArray(t.asignados) ? t.asignados : [];
      return asignados
        .filter((a: any) => !a.firmadoEn)
        .map((a: any) => {
          const w = workerById.get(a.workerId);
          return {
            talkId: t.id,
            talkTema: t.tema,
            talkFechaHora: t.fechaHora,
            workerId: a.workerId,
            workerNombre: w?.nombre ?? "(sin nombre)",
            workerRut: w?.rut ?? "",
          };
        });
    });

    const talkPendientesDetalle = talkPendientesAll.slice(0, 10);

    const fitAsignacionesHoy = (fitsHoy as any[]).reduce(
      (acc: number, f: any) => acc + (f.asignados?.length ?? 0),
      0
    );
    const fitFirmadasHoy = (fitsHoy as any[]).reduce(
      (acc: number, f: any) =>
        acc + (f.asignados?.filter((a: any) => !!a.firmadoEn)?.length ?? 0),
      0
    );

    const fitPendientesAll = (fitsHoy as any[]).flatMap((f: any) => {
      const asignados = Array.isArray(f.asignados) ? f.asignados : [];
      return asignados
        .filter((a: any) => !a.firmadoEn)
        .map((a: any) => {
          const w = workerById.get(a.workerId);
          return {
            fitId: f.id,
            fitTurno: String(f.turno ?? "").toUpperCase(),
            workerId: a.workerId,
            workerNombre: w?.nombre ?? "(sin nombre)",
            workerRut: w?.rut ?? "",
          };
        });
    });

    const fitPendientesDetalle = fitPendientesAll.slice(0, 10);

    const fitNoAptoDetalle = (fitsHoy as any[])
      .flatMap((f: any) => {
        const asignados = Array.isArray(f.asignados) ? f.asignados : [];
        return asignados
          .filter((a: any) => !!a.firmadoEn && a.apto === false)
          .map((a: any) => {
            const w = workerById.get(a.workerId);
            return {
              fitId: f.id,
              fitTurno: String(f.turno ?? "").toUpperCase(),
              workerId: a.workerId,
              workerNombre: w?.nombre ?? "(sin nombre)",
              workerRut: w?.rut ?? "",
              firmadoEn: new Date(a.firmadoEn),
            };
          });
      })
      .slice(0, 10);

    const fitNoAptoHoy = fitNoAptoDetalle.length;

    const pendingByWorker = new Map<
      string,
      {
        workerId: string;
        workerNombre: string;
        workerRut: string;
        pendingTotal: number;
        pendingART: number;
        pendingIRL: number;
        pendingTalk: number;
        pendingFit: number;
      }
    >();

    const bump = (
      workerId: string,
      field: "pendingART" | "pendingIRL" | "pendingTalk" | "pendingFit"
    ) => {
      const w = workerById.get(workerId);
      const current = pendingByWorker.get(workerId) ?? {
        workerId,
        workerNombre: w?.nombre ?? "(sin nombre)",
        workerRut: w?.rut ?? "",
        pendingTotal: 0,
        pendingART: 0,
        pendingIRL: 0,
        pendingTalk: 0,
        pendingFit: 0,
      };
      current[field] += 1;
      current.pendingTotal += 1;
      pendingByWorker.set(workerId, current);
    };

    irlPendientesAll.forEach((p) => bump(p.workerId, "pendingIRL"));
    talkPendientesAll.forEach((p) => bump(p.workerId, "pendingTalk"));
    fitPendientesAll.forEach((p) => bump(p.workerId, "pendingFit"));
    artPendientesAll.forEach((p) => bump(p.workerId, "pendingART"));

    const pendientesPorTrabajador = Array.from(pendingByWorker.values())
      .sort((a, b) => b.pendingTotal - a.pendingTotal)
      .slice(0, 10);

    setStats({
      workers,
      workersHabilitados,
      artsHoy,
      artsPendientes,
      artAsignacionesHoy,
      artFirmadasHoy,
      reportesAbiertos,
      irlAsignaciones,
      irlFirmadas,
      talkAsignaciones,
      talkFirmadas,
      fitAsignacionesHoy,
      fitFirmadasHoy,
      fitNoAptoHoy,
      artPendientesDetalle,
      irlPendientesDetalle,
      talkPendientesDetalle,
      fitPendientesDetalle,
      fitNoAptoDetalle,
      pendientesPorTrabajador,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const pendingIRL = Math.max(0, stats.irlAsignaciones - stats.irlFirmadas);
  const pendingTalks = Math.max(0, stats.talkAsignaciones - stats.talkFirmadas);
  const pendingFit = Math.max(0, stats.fitAsignacionesHoy - stats.fitFirmadasHoy);
  const pendingArt = stats.artsPendientes;

  const pendingTotal = pendingArt + pendingIRL + pendingTalks + pendingFit;

  return (
    <div className="dashboard">
      <div className="dashboard-pro-header">
        <div>
          <h2 className="dashboard-pro-title">Dashboard de Seguridad</h2>
          <p className="dashboard-pro-subtitle">
            Indicadores operativos para supervisión: firmas, pendientes y alertas.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadStats}
          style={{ padding: "0.5rem 0.8rem", fontSize: "0.9rem" }}
        >
          Actualizar
        </button>
      </div>

      <div className="dashboard-grid">
        <KPI
          label="Dotación habilitada"
          value={stats.workersHabilitados}
          hint={`Enrolados: ${stats.workers}`}
        />

        <KPI
          label="Pendientes de firma"
          value={pendingTotal}
          hint="ART/IRL/Charlas/Fit"
          variant={pendingTotal > 0 ? "warn" : "ok"}
        />

        <KPI
          label="Reportes abiertos"
          value={stats.reportesAbiertos}
          hint={
            stats.reportesAbiertos > 0
              ? "Revisar condiciones inseguras"
              : "Sin reportes críticos"
          }
          variant={stats.reportesAbiertos > 0 ? "danger" : "ok"}
        />

        <KPI
          label="NO aptos (hoy)"
          value={stats.fitNoAptoHoy}
          hint="Fit-for-Work"
          variant={stats.fitNoAptoHoy > 0 ? "danger" : "ok"}
        />
      </div>

      <div className="dashboard-pro-panels">
        <div className="dashboard-pro-panel">
          <div className="dashboard-pro-panel-header">
            <div>
              <div className="dashboard-pro-panel-title">Cumplimiento de firmas</div>
              <div className="dashboard-pro-panel-subtitle">
                ART y Fit-for-Work del día · IRL y Charlas global
              </div>
            </div>
          </div>

          <div className="dashboard-pro-module-grid">
            <ModuleProgress
              title="ART (hoy)"
              accent="#2563eb"
              assigned={stats.artAsignacionesHoy}
              signed={stats.artFirmadasHoy}
              pending={pendingArt}
            />
            <ModuleProgress
              title="IRL"
              accent="#f59e0b"
              assigned={stats.irlAsignaciones}
              signed={stats.irlFirmadas}
              pending={pendingIRL}
            />
            <ModuleProgress
              title="Charlas"
              accent="#7c3aed"
              assigned={stats.talkAsignaciones}
              signed={stats.talkFirmadas}
              pending={pendingTalks}
            />
            <ModuleProgress
              title="Fit-for-Work (hoy)"
              accent="#16a34a"
              assigned={stats.fitAsignacionesHoy}
              signed={stats.fitFirmadasHoy}
              pending={pendingFit}
            />
          </div>
        </div>

        <div className="dashboard-pro-panel">
          <div className="dashboard-pro-panel-header">
            <div>
              <div className="dashboard-pro-panel-title">Pendientes por módulo</div>
              <div className="dashboard-pro-panel-subtitle">
                Dónde concentrar acciones
              </div>
            </div>
          </div>

          <PendingByModule
            items={[
              { label: "ART (hoy)", value: pendingArt, color: "#2563eb" },
              { label: "IRL", value: pendingIRL, color: "#f59e0b" },
              { label: "Charlas", value: pendingTalks, color: "#7c3aed" },
              { label: "Fit-for-Work (hoy)", value: pendingFit, color: "#16a34a" },
            ]}
          />
        </div>

        <div className="dashboard-pro-panel">
          <div className="dashboard-pro-panel-header">
            <div>
              <div className="dashboard-pro-panel-title">Trabajadores con pendientes</div>
              <div className="dashboard-pro-panel-subtitle">
                Top 10 por cantidad de firmas pendientes
              </div>
            </div>
          </div>

          <PendingByWorker rows={stats.pendientesPorTrabajador} />
        </div>

        <div className="dashboard-pro-panel">
          <div className="dashboard-pro-panel-header">
            <div>
              <div className="dashboard-pro-panel-title">Alertas Fit-for-Work (hoy)</div>
              <div className="dashboard-pro-panel-subtitle">
                Trabajadores marcados como NO aptos
              </div>
            </div>
          </div>

          <NoAptoList rows={stats.fitNoAptoDetalle} />
        </div>

        <div className="dashboard-pro-panel">
          <div className="dashboard-pro-panel-header">
            <div>
              <div className="dashboard-pro-panel-title">Pendientes recientes</div>
              <div className="dashboard-pro-panel-subtitle">
                Muestras de pendientes (top 10)
              </div>
            </div>
          </div>

          <div className="dashboard-pro-pending-grid">
            <PendingList
              title="ART (hoy)"
              emptyText="Sin pendientes"
              items={stats.artPendientesDetalle.map((x) => ({
                key: `${x.artId}-${x.workerId}`,
                primary: x.workerNombre,
                secondary: `${x.artObra} · ${formatDate(x.artFecha)}`,
              }))}
            />
            <PendingList
              title="IRL"
              emptyText="Sin pendientes"
              items={stats.irlPendientesDetalle.map((x) => ({
                key: `${x.irlId}-${x.workerId}`,
                primary: x.workerNombre,
                secondary: `${x.irlTitulo} · ${x.irlObra} · ${formatDate(x.irlFecha)}`,
              }))}
            />
            <PendingList
              title="Charlas"
              emptyText="Sin pendientes"
              items={stats.talkPendientesDetalle.map((x) => ({
                key: `${x.talkId}-${x.workerId}`,
                primary: x.workerNombre,
                secondary: `${x.talkTema} · ${formatDateTime(x.talkFechaHora)}`,
              }))}
            />
            <PendingList
              title="Fit-for-Work (hoy)"
              emptyText="Sin pendientes"
              items={stats.fitPendientesDetalle.map((x) => ({
                key: `${x.fitId}-${x.workerId}`,
                primary: x.workerNombre,
                secondary: `Turno ${x.fitTurno}`,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-pro-footnote">
        Información almacenada localmente. La operación preventiva no se detiene
        por falta de conexión.
      </div>
    </div>
  );
}

function ModuleProgress({
  title,
  accent,
  assigned,
  signed,
  pending,
}: {
  title: string;
  accent: string;
  assigned: number;
  signed: number;
  pending: number;
}) {
  const pct = assigned > 0 ? Math.round((signed / assigned) * 100) : 0;
  return (
    <div className="dashboard-pro-module" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="dashboard-pro-module-title">{title}</div>
      <div className="dashboard-pro-module-meta">
        <strong>{pct}%</strong> · {signed} firmadas · {pending} pendientes
      </div>
      <div className="dashboard-pro-progress">
        <div
          className="dashboard-pro-progress-bar"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function PendingByModule({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="dashboard-pro-bars">
      {items.map((i) => {
        const pct = Math.round((i.value / max) * 100);
        return (
          <div key={i.label} className="dashboard-pro-bar-row">
            <div className="dashboard-pro-bar-label">{i.label}</div>
            <div className="dashboard-pro-bar-track">
              <div
                className="dashboard-pro-bar-fill"
                style={{ width: `${pct}%`, background: i.color }}
              />
            </div>
            <div className="dashboard-pro-bar-value">{i.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function PendingByWorker({
  rows,
}: {
  rows: {
    workerId: string;
    workerNombre: string;
    workerRut: string;
    pendingTotal: number;
    pendingART: number;
    pendingIRL: number;
    pendingTalk: number;
    pendingFit: number;
  }[];
}) {
  if (rows.length === 0) {
    return <div className="dashboard-pro-empty">Sin pendientes registrados.</div>;
  }

  return (
    <div className="dashboard-pro-table">
      <div className="dashboard-pro-table-head">
        <div>Trabajador</div>
        <div style={{ textAlign: "right" }}>Pendientes</div>
      </div>

      {rows.map((r) => (
        <div key={r.workerId} className="dashboard-pro-table-row">
          <div>
            <div className="dashboard-pro-table-primary">
              {r.workerNombre}{r.workerRut ? ` (${r.workerRut})` : ""}
            </div>
            <div className="dashboard-pro-table-secondary">
              ART {r.pendingART} · IRL {r.pendingIRL} · Charlas {r.pendingTalk} · Fit {r.pendingFit}
            </div>
          </div>
          <div className="dashboard-pro-pill">{r.pendingTotal}</div>
        </div>
      ))}
    </div>
  );
}

function NoAptoList({
  rows,
}: {
  rows: {
    fitId: string;
    fitTurno: string;
    workerId: string;
    workerNombre: string;
    workerRut: string;
    firmadoEn: Date;
  }[];
}) {
  if (rows.length === 0) {
    return <div className="dashboard-pro-empty">Sin alertas de NO apto hoy.</div>;
  }

  return (
    <div className="dashboard-pro-alert-list">
      {rows.map((r) => (
        <div key={`${r.fitId}-${r.workerId}`} className="dashboard-pro-alert-item">
          <div>
            <div className="dashboard-pro-table-primary">
              {r.workerNombre}{r.workerRut ? ` (${r.workerRut})` : ""}
            </div>
            <div className="dashboard-pro-table-secondary">
              Turno {r.fitTurno} · {formatDateTime(r.firmadoEn)}
            </div>
          </div>
          <span className="dashboard-pro-badge-danger">NO APTO</span>
        </div>
      ))}
    </div>
  );
}

function PendingList({
  title,
  items,
  emptyText,
}: {
  title: string;
  emptyText: string;
  items: { key: string; primary: string; secondary: string }[];
}) {
  return (
    <div className="dashboard-pro-mini">
      <div className="dashboard-pro-mini-title">{title}</div>
      {items.length === 0 ? (
        <div className="dashboard-pro-empty">{emptyText}</div>
      ) : (
        <div className="dashboard-pro-mini-list">
          {items.map((i) => (
            <div key={i.key} className="dashboard-pro-mini-item">
              <div className="dashboard-pro-mini-primary">{i.primary}</div>
              <div className="dashboard-pro-mini-secondary">{i.secondary}</div>
            </div>
          ))}
        </div>
      )}
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

function formatDateTime(date: string | Date) {
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return String(date);
  }
}

/* ===============================
   KPI CARD
   =============================== */

function KPI({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  variant?: "default" | "ok" | "warn" | "danger";
}) {
  const colors = {
    default: "#f1f5f9",
    ok: "#dcfce7",
    warn: "#fef3c7",
    danger: "#fee2e2",
  };

  return (
    <div className="kpi-card" style={{ background: colors[variant] }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
