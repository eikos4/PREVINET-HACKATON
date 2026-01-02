import { useEffect, useMemo, useState } from "react";

import Login from "../modules/auth/Login";
import { getCurrentUser, logout } from "../modules/auth/auth.service";
import type { User, UserRole } from "../modules/auth/auth.service";

import WorkerForm from "../modules/workers/WorkerForm";
import WorkerList from "../modules/workers/WorkerList.tsx";
import WorkerProfile from "../modules/workers/WorkerProfile";
import WorkerJourney from "../modules/workers/WorkerJourney";
import { getWorkerById } from "../modules/workers/worker.service";
import type { Worker } from "../modules/workers/worker.service";
import {
  getWorkerJourneyStatus,
  isWorkerJourneySectionAllowed,
} from "../modules/workers/workerJourney.service";

import ArtForm from "../modules/art/ArtForm";
import ArtList from "../modules/art/ArtList";
import ArtWorkerList from "../modules/art/ArtWorkerList";

import IRLForm from "../modules/irl/IRLForm";
import IRLList from "../modules/irl/IRLList";
import IRLWorkerList from "../modules/irl/IRLWorkerList";

import TalkForm from "../modules/talks/TalkForm";
import TalkList from "../modules/talks/TalkList";
import TalkWorkerList from "../modules/talks/TalkWorkerList";

import FitForWorkForm from "../modules/fitForWork/FitForWorkForm";
import FitForWorkList from "../modules/fitForWork/FitForWorkList";
import FitForWorkWorkerList from "../modules/fitForWork/FitForWorkWorkerList";

import FindingIncidentForm from "../modules/findingIncidents/FindingIncidentForm.tsx";
import FindingIncidentList from "../modules/findingIncidents/FindingIncidentList.tsx";

import DocumentForm from "../modules/documents/DocumentForm.tsx";
import DocumentList from "../modules/documents/DocumentList.tsx";
import DocumentWorkerList from "../modules/documents/DocumentWorkerList.tsx";

import Dashboard from "../modules/dashboard/Dashboard";
import OnlineStatus from "../components/OnlineStatus";

import AdminUsers from "../modules/admin/AdminUsers.tsx";

import PrevencionistaTimelineView from "../modules/prevencionista/PrevencionistaTimelineView";

import {
  canViewDashboard,
  canManageWorkers,
  canViewWorkerDetail,
  canManageDocuments,
  canViewDocuments,
  canManageIRL,
  canViewIRL,
  canManageTalks,
  canViewTalks,
  canManageFitForWork,
  canViewFitForWork,
  canCreateART,
  canViewART,
  canCreateTalks,
  canCreateFitForWork,
  canCreateFindingIncidents,
  canViewFindingIncidents,
  isReadOnly,
  isSystemAdmin,
} from "../modules/auth/permissions";

type View = "landing" | "login" | "app";
type Section = "inicio" | "dashboard" | "workers" | "workerTimeline" | "art" | "profile" | "irl" | "talks" | "fitForWork" | "findingIncidents" | "documents" | "adminUsers";

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [section, setSection] = useState<Section>("dashboard");
  const [reload, setReload] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerError, setWorkerError] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [journeyStatus, setJourneyStatus] = useState<Awaited<ReturnType<typeof getWorkerJourneyStatus>> | null>(null);
  const [journeyReload, setJourneyReload] = useState(0);

  const navigateTo = (next: Section) => {
    if (role === "trabajador" && worker?.id) {
      const allowed = isWorkerJourneySectionAllowed(journeyStatus, next);
      if (!allowed) {
        setSection("inicio");
        setMenuOpen(false);
        return;
      }
    }

    setSection(next);
    setMenuOpen(false);
  };

  /* ===============================
     LOAD CURRENT USER
     =============================== */
  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) {
        setUser(u);
        setView("app");
      }
    });
  }, []);

  const role: UserRole | null = user?.role ?? null;

  /* ===============================
     LOAD WORKER (IF TRABAJADOR)
     =============================== */
  useEffect(() => {
    setWorker(null);
    setWorkerError("");

    if (!user || user.role !== "trabajador") return;
    if (!user.workerId) {
      setWorkerError("No se encontró trabajador asociado a esta sesión");
      return;
    }

    getWorkerById(user.workerId)
      .then((w) => {
        if (!w) {
          setWorkerError("No se encontró el trabajador enrolado");
          return;
        }
        setWorker(w);
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "No se pudo cargar el trabajador";
        setWorkerError(message);
      });
  }, [user]);

  useEffect(() => {
    if (view !== "app") return;
    if (role !== "trabajador") {
      setJourneyStatus(null);
      setJourneyError("");
      setJourneyLoading(false);
      return;
    }

    if (!worker?.id) return;

    setJourneyLoading(true);
    setJourneyError("");
    getWorkerJourneyStatus(worker.id)
      .then((s) => setJourneyStatus(s))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "No se pudo cargar el inicio de jornada";
        setJourneyError(msg);
      })
      .finally(() => setJourneyLoading(false));
  }, [view, role, worker?.id, journeyReload, section]);

  /* ===============================
     ALLOWED SECTIONS BY ROLE
     =============================== */
  const allowedSections = useMemo<Section[]>(() => {
    if (!role) return [];

    const s: Section[] = [];
    if (role === "trabajador") s.push("inicio");
    if (role === "trabajador") s.push("profile");
    if (canViewDashboard(role)) s.push("dashboard");
    if (canManageWorkers(role)) s.push("workers");
    if (canViewWorkerDetail(role)) s.push("workerTimeline");
    if (canManageDocuments(role)) s.push("documents");
    if (canViewDocuments(role)) s.push("documents");
    if (canManageIRL(role)) s.push("irl");
    if (canViewIRL(role)) s.push("irl");
    if (canManageTalks(role)) s.push("talks");
    if (canViewTalks(role)) s.push("talks");
    if (canManageFitForWork(role)) s.push("fitForWork");
    if (canViewFitForWork(role)) s.push("fitForWork");
    if (canViewART(role)) s.push("art");
    if (canViewFindingIncidents(role) || canCreateFindingIncidents(role)) {
      s.push("findingIncidents");
    }
    if (role === "admin") s.push("adminUsers");

    return s;
  }, [role]);

  /* ===============================
     GUARD: REDIRECT IF FORBIDDEN
     =============================== */
  useEffect(() => {
    if (view !== "app" || !role) return;
    if (!allowedSections.includes(section) && allowedSections.length > 0) {
      setSection(allowedSections[0]);
    }
  }, [view, role, section, allowedSections]);

  const roleLabel = (r: UserRole) => {
    switch (r) {
      case "trabajador":
        return "Trabajador";
      case "prevencionista":
        return "Prevencionista";
      case "supervisor":
        return "Supervisor";
      case "administrador":
        return "Administrador";
      case "auditor":
        return "Auditor";
      case "admin":
        return "Admin Empresa";
      default:
        return "Usuario";
    }
  };

  const sectionLabel = (s: Section) => {
    switch (s) {
      case "inicio":
        return "Inicio";
      case "dashboard":
        return "Dashboard";
      case "workers":
        return "Trabajadores";
      case "workerTimeline":
        return "Línea de tiempo";
      case "art":
        return "ART";
      case "profile":
        return "Mi perfil";
      case "irl":
        return "IRL";
      case "talks":
        return "Charlas";
      case "fitForWork":
        return "Fit-for-Work";
      case "findingIncidents":
        return "Hallazgos/Incidencias";
      case "documents":
        return "Documentos";
      case "adminUsers":
        return "Usuarios";
      default:
        return "";
    }
  };

  /* ===============================
     LANDING
     =============================== */
  if (view === "landing") {
    return (
      <div className="landing">
        <div className="landing-shell">
          <div className="landing-card landing-hero">
            <img className="landing-logo" src="/logo.png" alt="PreviNet" />

            <p className="landing-subtitle">
              Plataforma preventiva <strong>offline-first</strong>
            </p>

            <p className="landing-description">
              Diseñada para gestión preventiva en terreno, con firma digital y trazabilidad.
            </p>

            <div className="landing-badges">
              <span className="landing-badge">📴 Sin internet</span>
              <span className="landing-badge">🖊️ Firma digital</span>
              <span className="landing-badge">📄 PDFs firmados</span>
              <span className="landing-badge">📊 Dashboard</span>
              <span className="landing-badge">🔎 Auditoría</span>
            </div>

            <div className="landing-actions">
              <button className="btn-primary" onClick={() => setView("login")}>
                Ingresar al sistema
              </button>
            </div>

            <p className="landing-footnote">Menos papeleo, más prevención en terreno.</p>
            <p className="landing-footnote">BY kodesk.cl</p>
          </div>
        </div>
      </div>
    );
  }

  /* ===============================
     LOGIN
     =============================== */
  if (view === "login") {
    return (
      <Login
        onLogin={async () => {
          const u = await getCurrentUser();
          if (u) {
            setUser(u);
            setView("app");
          }
        }}
      />
    );
  }

  /* ===============================
     APP
     =============================== */
  if (!user || !role) {
    return <p style={{ padding: "2rem" }}>Cargando sesión…</p>;
  }

  const readOnly =
    isReadOnly(role) || isSystemAdmin(role);

  const canSeeDocuments = canManageDocuments(role) || canViewDocuments(role);
  const canSeeIRL = canManageIRL(role) || canViewIRL(role);
  const canSeeTalks = canManageTalks(role) || canViewTalks(role);
  const canSeeFitForWork = canManageFitForWork(role) || canViewFitForWork(role);
  const canSeeFindingIncidents = canViewFindingIncidents(role) || canCreateFindingIncidents(role);

  const navItems: Array<{ key: Section; label: string; icon: string; visible: boolean }> = [
    { key: "inicio", label: "Inicio", icon: "🏁", visible: role === "trabajador" },
    { key: "profile", label: "Mi perfil", icon: "🙍", visible: role === "trabajador" },
    { key: "dashboard", label: "Dashboard", icon: "📊", visible: canViewDashboard(role) },
    { key: "workers", label: "Trabajadores", icon: "👷", visible: canManageWorkers(role) },
    { key: "workerTimeline", label: "Línea de tiempo", icon: "🕒", visible: canViewWorkerDetail(role) },
    { key: "documents", label: "Documentos", icon: "📎", visible: canSeeDocuments },
    { key: "irl", label: "IRL", icon: "🧾", visible: canSeeIRL },
    { key: "talks", label: "Charlas", icon: "🗣️", visible: canSeeTalks },
    { key: "fitForWork", label: "Fit-for-Work", icon: "✅", visible: canSeeFitForWork },
    { key: "art", label: "ART", icon: "📝", visible: canViewART(role) },
    { key: "findingIncidents", label: "Hallazgos/Incidencias", icon: "🧱", visible: canSeeFindingIncidents },
    { key: "adminUsers", label: "Usuarios", icon: "👥", visible: role === "admin" },
  ];

  return (
    <div className="layout">
      {/* OVERLAY MOBILE */}
      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">PreviNet</div>
          <div className="sidebar-meta">
            <div className="sidebar-role">{roleLabel(role)}</div>
            {user.name && <div className="sidebar-user">{user.name}</div>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((i) => i.visible)
            .map((i) => {
              const active = section === i.key;
              const locked =
                role === "trabajador" &&
                !isWorkerJourneySectionAllowed(journeyStatus, i.key);
              return (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => navigateTo(i.key)}
                  className={`sidebar-item ${active ? "active" : ""}`}
                  disabled={locked}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sidebar-icon">{i.icon}</span>
                  <span className="sidebar-text">{i.label}</span>
                </button>
              );
            })}
        </nav>

        <button
          className="btn-logout sidebar-logout"
          onClick={() => {
            logout();
            setUser(null);
            setView("landing");
            setMenuOpen(false);
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      {/* CONTENT */}
      <main className="content">
        {/* MENU MOBILE */}
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>

        {/* TOP BAR */}
        <div className="top-bar">
          <div>
            <h1>{sectionLabel(section)}</h1>
            <small>
              Perfil: <strong>{roleLabel(role)}</strong>
              {readOnly && " · Solo lectura"}
              {role === "trabajador" && worker && (
                <>
                  {" "}· <strong>{worker.nombre}</strong>
                  {" "}· {worker.cargo}
                  {" "}· {worker.obra}
                </>
              )}
            </small>
            {role === "trabajador" && !worker && workerError && (
              <small style={{ display: "block", color: "#ef4444" }}>
                {workerError}
              </small>
            )}
          </div>

          <OnlineStatus />
        </div>

        {/* SECTIONS */}
        {role === "trabajador" && !worker && !workerError && (
          <div className="card">
            <p style={{ margin: 0, color: "#64748b" }}>
              Cargando tu perfil de trabajador…
            </p>
          </div>
        )}

        {role === "trabajador" && !worker && workerError && (
          <div className="card">
            <p style={{ margin: 0, color: "#ef4444", fontWeight: 700 }}>
              {workerError}
            </p>
          </div>
        )}

        {section === "inicio" && role === "trabajador" && worker && (
          <WorkerJourney
            worker={worker}
            status={journeyStatus}
            loading={journeyLoading}
            error={journeyError}
            onRefresh={() => setJourneyReload((x) => x + 1)}
            onGoTo={(s) => navigateTo(s)}
          />
        )}

        {section === "dashboard" && canViewDashboard(role) && (
          <Dashboard />
        )}

        {section === "workers" && canManageWorkers(role) && (
          <>
            {!readOnly && (
              <WorkerForm
                onCreated={() => setReload((r) => r + 1)}
              />
            )}
            <WorkerList key={`w-${reload}`} readOnly={readOnly} />
          </>
        )}

        {section === "workerTimeline" && canViewWorkerDetail(role) && (
          <PrevencionistaTimelineView />
        )}

        {section === "documents" && canManageDocuments(role) && (
          <>
            {!readOnly && (
              <DocumentForm
                onCreated={() => setReload((r) => r + 1)}
                creadoPorUserId={user.id}
              />
            )}
            <DocumentList key={`d-${reload}`} />
          </>
        )}

        {section === "documents" && canViewDocuments(role) && (
          <>
            {worker ? (
              <DocumentWorkerList worker={worker} key={`dw-${reload}`} />
            ) : (
              <div className="card">
                <p style={{ margin: 0, color: "#64748b" }}>
                  Cargando documentos…
                </p>
              </div>
            )}
          </>
        )}

        {section === "irl" && canManageIRL(role) && (
          <>
            {!readOnly && (
              <IRLForm
                creadoPorUserId={user.id}
                onCreated={() => setReload((r) => r + 1)}
              />
            )}
            <IRLList key={`i-${reload}`} />
          </>
        )}

        {section === "irl" && canViewIRL(role) && (
          <>
            {worker ? (
              <IRLWorkerList worker={worker} key={`iw-${reload}`} />
            ) : (
              <div className="card">
                <p style={{ margin: 0, color: "#64748b" }}>
                  Cargando IRL…
                </p>
              </div>
            )}
          </>
        )}

        {section === "talks" && canManageTalks(role) && (
          <>
            {!readOnly && canCreateTalks(role) && (
              <TalkForm
                creadoPorUserId={user.id}
                onCreated={() => setReload((r) => r + 1)}
              />
            )}
            <TalkList key={`t-${reload}`} />
          </>
        )}

        {section === "talks" && canViewTalks(role) && (
          <>
            {worker ? (
              <TalkWorkerList worker={worker} key={`tw-${reload}`} />
            ) : (
              <div className="card">
                <p style={{ margin: 0, color: "#64748b" }}>
                  Cargando charlas…
                </p>
              </div>
            )}
          </>
        )}

        {section === "fitForWork" && canManageFitForWork(role) && (
          <>
            {!readOnly && canCreateFitForWork(role) && (
              <FitForWorkForm
                creadoPorUserId={user.id}
                onCreated={() => setReload((r) => r + 1)}
              />
            )}
            <FitForWorkList key={`ffw-${reload}`} />
          </>
        )}

        {section === "fitForWork" && canViewFitForWork(role) && (
          <>
            {worker ? (
              <FitForWorkWorkerList worker={worker} key={`ffww-${reload}`} />
            ) : (
              <div className="card">
                <p style={{ margin: 0, color: "#64748b" }}>
                  Cargando evaluaciones…
                </p>
              </div>
            )}
          </>
        )}

        {section === "art" && canViewART(role) && (
          <>
            {role === "trabajador" ? (
              worker ? (
                <ArtWorkerList worker={worker} key={`aw-${reload}`} />
              ) : (
                <div className="card">
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Cargando ART/AST…
                  </p>
                </div>
              )
            ) : (
              <>
                {canCreateART(role) && !readOnly && (
                  <ArtForm
                    creadoPorUserId={user.id}
                    onCreated={() => setReload((r) => r + 1)}
                  />
                )}
                <ArtList key={`a-${reload}`} />
              </>
            )}
          </>
        )}

        {section === "findingIncidents" && (
          <>
            {canCreateFindingIncidents(role) && !readOnly && (
              <FindingIncidentForm
                creadoPorUserId={user.id}
                defaultObra={worker?.obra}
                onCreated={() => setReload((r) => r + 1)}
              />
            )}

            {canViewFindingIncidents(role) && (
              <FindingIncidentList
                readOnly={readOnly}
                currentUserId={user.id}
                reloadKey={reload}
              />
            )}
          </>
        )}

        {section === "profile" && role === "trabajador" && (
          <>
            {worker ? (
              <WorkerProfile worker={worker} />
            ) : (
              <div className="card">
                <p style={{ margin: 0, color: "#64748b" }}>
                  Cargando perfil…
                </p>
              </div>
            )}
          </>
        )}

        {section === "adminUsers" && role === "admin" && (
          <AdminUsers currentUser={user} />
        )}
      </main>
    </div>
  );
}