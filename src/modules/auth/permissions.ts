import type { UserRole } from "./auth.service";

/* ===============================
   VISIBILIDAD DE SECCIONES
   =============================== */

export const canViewDashboard = (role: UserRole) =>
  role !== "trabajador";

export const canManageWorkers = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canViewART = (role: UserRole) =>
  role !== "administrador";

export const canViewReports = (role: UserRole) =>
  role !== "administrador";

export const canViewFindingIncidents = (role: UserRole) =>
  role !== "administrador";

export const canViewWorkerDetail = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canManageDocuments = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canViewDocuments = (role: UserRole) =>
  role === "trabajador";

export const canManageIRL = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canViewIRL = (role: UserRole) =>
  role === "trabajador";

export const canManageTalks = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canViewTalks = (role: UserRole) =>
  role === "trabajador";

export const canManageFitForWork = (role: UserRole) =>
  role === "prevencionista" ||
  role === "supervisor" ||
  role === "administrador" ||
  role === "auditor";

export const canViewFitForWork = (role: UserRole) =>
  role === "trabajador";

/* ===============================
   CREACIÓN
   =============================== */

export const canCreateART = (role: UserRole) =>
  role === "prevencionista" || role === "supervisor";

export const canCreateTalks = (role: UserRole) =>
  role === "prevencionista" || role === "supervisor";

export const canCreateFitForWork = (role: UserRole) =>
  role === "prevencionista" || role === "supervisor";

export const canCreateReport = (role: UserRole) =>
  role === "trabajador";

export const canCreateFindingIncidents = (role: UserRole) =>
  role === "trabajador" || role === "prevencionista";

/* ===============================
   ROLES ESPECIALES
   =============================== */

export const isReadOnly = (role: UserRole) =>
  role === "auditor";

export const isCompanyAdmin = (role: UserRole) =>
  role === "admin";

export const isSystemAdmin = (role: UserRole) =>
  role === "administrador";
