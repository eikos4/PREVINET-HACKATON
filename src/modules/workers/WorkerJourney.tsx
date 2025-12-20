import { useMemo } from "react";

import type { Worker } from "./worker.service";
import type { WorkerJourneyStatus, WorkerJourneyStepKey } from "./workerJourney.service";

type Props = {
  worker: Worker;
  status: WorkerJourneyStatus | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onGoTo: (section: "fitForWork" | "art" | "irl" | "documents" | "talks" | "profile") => void;
};

export default function WorkerJourney({ worker, status, loading, error, onRefresh, onGoTo }: Props) {
  const steps = useMemo(() => {
    const list: Array<{
      key: WorkerJourneyStepKey;
      title: string;
      subtitle: string;
      icon: string;
      actionLabel: string;
      actionSection: "fitForWork" | "art" | "irl" | "documents" | "talks";
    }> = [
      {
        key: "fitForWork",
        title: "Fit-for-Work",
        subtitle: "Evaluación diaria (hoy)",
        icon: "✅",
        actionLabel: "Completar evaluación",
        actionSection: "fitForWork",
      },
      {
        key: "art",
        title: "ART / AST",
        subtitle: "Documentos de la jornada (hoy)",
        icon: "📝",
        actionLabel: "Firmar ART",
        actionSection: "art",
      },
      {
        key: "irl",
        title: "IRL",
        subtitle: "Lectura + preguntas + firma",
        icon: "🧾",
        actionLabel: "Firmar IRL",
        actionSection: "irl",
      },
      {
        key: "documents",
        title: "Documentos",
        subtitle: "Políticas / procedimientos asignados",
        icon: "📎",
        actionLabel: "Firmar documentos",
        actionSection: "documents",
      },
      {
        key: "talks",
        title: "Charlas",
        subtitle: "Charlas diarias asignadas",
        icon: "🗣️",
        actionLabel: "Firmar charlas",
        actionSection: "talks",
      },
    ];

    return list;
  }, []);

  const doneCount = useMemo(() => {
    if (!status) return 0;
    return steps.filter((s) => status.steps[s.key].pending === 0).length;
  }, [status, steps]);

  const activeKey = status?.currentStep === "done" ? null : (status?.currentStep ?? null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5">
        <div className="flex" style={{ justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <h3 className="text-xl font-semibold text-white m-0">Inicio de jornada</h3>
            <p className="text-sm text-slate-200" style={{ margin: "0.35rem 0 0 0" }}>
              {worker.nombre} · {worker.cargo} · {worker.obra}
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={onRefresh}
            disabled={loading}
            style={{ padding: "0.5rem 0.8rem", fontSize: "0.9rem" }}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <p className="form-error" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          style={{ marginBottom: "1rem" }}
        >
          <div className="flex" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div className="text-sm font-semibold text-gray-900">Progreso</div>
              <div className="text-sm text-gray-600">
                {status?.currentStep === "done"
                  ? "Jornada completada"
                  : "Completa los pasos en orden para habilitar el siguiente"}
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {doneCount}/{steps.length}
            </div>
          </div>

          <div
            className="mt-3"
            style={{ height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round((doneCount / steps.length) * 100)}%`,
                background: "linear-gradient(90deg, #2563eb, #06b6d4)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, idx) => {
            const counts = status?.steps[s.key] ?? { pending: 0, total: 0 };
            const completed = counts.pending === 0;
            const active = activeKey === s.key;
            const locked = !completed && activeKey !== null && !active;

            return (
              <div
                key={s.key}
                className="rounded-xl border border-gray-200 bg-white"
                style={{
                  padding: "0.9rem",
                  boxShadow: active ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : undefined,
                  borderColor: active ? "rgba(37, 99, 235, 0.45)" : undefined,
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <div className="flex" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div className="flex" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div
                      className="rounded-lg"
                      style={{
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: active ? "#eff6ff" : "#f8fafc",
                        border: "1px solid #e5e7eb",
                        fontSize: "1.1rem",
                      }}
                    >
                      {s.icon}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {idx + 1}. {s.title}
                        {active && (
                          <span
                            className="ml-2 text-xs font-semibold"
                            style={{
                              color: "#1d4ed8",
                              background: "#eff6ff",
                              border: "1px solid rgba(37, 99, 235, 0.25)",
                              borderRadius: 999,
                              padding: "0.15rem 0.5rem",
                              marginLeft: 8,
                            }}
                          >
                            Paso actual
                          </span>
                        )}
                        {completed && (
                          <span
                            className="ml-2 text-xs font-semibold"
                            style={{
                              color: "#16a34a",
                              background: "#f0fdf4",
                              border: "1px solid rgba(22, 163, 74, 0.25)",
                              borderRadius: 999,
                              padding: "0.15rem 0.5rem",
                              marginLeft: 8,
                            }}
                          >
                            Completado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{s.subtitle}</div>
                      <div className="text-sm" style={{ color: completed ? "#16a34a" : "#b91c1c", marginTop: 4 }}>
                        {counts.total === 0
                          ? "Sin asignaciones"
                          : completed
                            ? "Sin pendientes"
                            : `${counts.pending} pendiente(s) de ${counts.total}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onGoTo(s.actionSection)}
                      disabled={locked}
                      style={{ padding: "0.4rem 0.7rem", fontSize: "0.85rem" }}
                    >
                      {s.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900">Accesos rápidos</div>
          <div className="text-sm text-gray-600" style={{ marginTop: 4 }}>
            Puedes ver tu información personal y estado general en tu perfil.
          </div>
          <div className="flex" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onGoTo("profile")}
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
            >
              Ir a Mi perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
