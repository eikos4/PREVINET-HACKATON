import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";

export type FindingIncidentType = "HALLAZGO" | "INCIDENCIA";

export type FindingIncidentStatus = "ABIERTO" | "EN_PROCESO" | "CERRADO";

export type EvidenceAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  creadoEn: Date;
};

export type FollowUpEntry = {
  id: string;
  texto: string;
  creadoEn: Date;
  creadoPorUserId?: string;
};

export type FindingIncident = {
  id: string;
  tipo: FindingIncidentType;
  estado: FindingIncidentStatus;

  obra: string;
  lugar: string;
  fecha: string;
  hora?: string;

  descripcion: string;

  // Hallazgo
  riesgoPotencial?: string;
  responsable?: string;
  recomendacion?: string;
  plazoResolver?: string;

  // Incidencia
  personasInvolucradas?: string;
  consecuencias?: string;
  causasProbables?: string;
  medidasInmediatas?: string;

  evidencias?: EvidenceAttachment[];
  seguimiento?: FollowUpEntry[];

  creadoPorUserId?: string;
  creadoEn: Date;

  cerradoEn?: Date;
};

export async function getFindingIncidents(): Promise<FindingIncident[]> {
  return (await db.table("findingIncidents").toArray()) as FindingIncident[];
}

export async function addFindingIncident(
  data: Omit<FindingIncident, "id" | "creadoEn" | "estado">
) {
  const record: FindingIncident = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    estado: "ABIERTO",
    ...data,
  };

  await db.table("findingIncidents").add(record);
  await addToSyncQueue("findingIncident");

  return record;
}

export async function updateFindingIncidentStatus(
  id: string,
  estado: FindingIncidentStatus
) {
  const current = (await db.table("findingIncidents").get(id)) as
    | FindingIncident
    | undefined;
  if (!current) throw new Error("Registro no encontrado");

  const updated: FindingIncident = {
    ...current,
    estado,
    cerradoEn: estado === "CERRADO" ? new Date() : current.cerradoEn,
  };

  await db.table("findingIncidents").put(updated);
  await addToSyncQueue("findingIncident");

  return updated;
}

export async function addFindingIncidentFollowUp(
  id: string,
  texto: string,
  creadoPorUserId?: string
) {
  if (!texto.trim()) throw new Error("Comentario requerido");

  const current = (await db.table("findingIncidents").get(id)) as
    | FindingIncident
    | undefined;
  if (!current) throw new Error("Registro no encontrado");

  const entry: FollowUpEntry = {
    id: crypto.randomUUID(),
    texto: texto.trim(),
    creadoEn: new Date(),
    creadoPorUserId,
  };

  const updated: FindingIncident = {
    ...current,
    seguimiento: [...(current.seguimiento ?? []), entry],
  };

  await db.table("findingIncidents").put(updated);
  await addToSyncQueue("findingIncident");

  return updated;
}

export async function addFindingIncidentEvidences(
  id: string,
  files: File[]
) {
  const current = (await db.table("findingIncidents").get(id)) as
    | FindingIncident
    | undefined;
  if (!current) throw new Error("Registro no encontrado");

  const toAdd: EvidenceAttachment[] = files.map((f) => ({
    id: crypto.randomUUID(),
    fileName: f.name,
    mimeType: f.type || "application/octet-stream",
    blob: f,
    creadoEn: new Date(),
  }));

  const updated: FindingIncident = {
    ...current,
    evidencias: [...(current.evidencias ?? []), ...toAdd],
  };

  await db.table("findingIncidents").put(updated);
  await addToSyncQueue("findingIncident");

  return updated;
}
