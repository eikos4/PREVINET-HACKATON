import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";
import { saveSignedFitForWorkPdf } from "./fitForWorkPdf.service";

export type FitForWorkQuestion = {
  id: string;
  question: string;
  response?: boolean;
};

export type FitForWorkWorkerAssignment = {
  workerId: string;
  token: string;
  responses?: FitForWorkQuestion[];
  firmadoPorNombre?: string;
  firmadoPorRut?: string;
  firmadoEn?: Date;
  apto?: boolean;
  geo?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
};

export type FitForWork = {
  id: string;
  fecha: string;
  turno: "mañana" | "tarde" | "noche";
  obra?: string;
  estado: "PUBLICADO";
  questions: FitForWorkQuestion[];
  asignados: FitForWorkWorkerAssignment[];
  creadoPorUserId?: string;
  creadoEn: Date;
};

const DEFAULT_QUESTIONS: Omit<FitForWorkQuestion, "response">[] = [
  { id: "q1", question: "¿Te sientes en buen estado de salud?" },
  { id: "q2", question: "¿Has descansado adecuadamente (mínimo 6 horas)?" },
  { id: "q3", question: "¿Estás libre de alcohol y drogas?" },
  { id: "q4", question: "¿Estás libre de lesiones o dolores que puedan afectar tu trabajo?" },
  { id: "q5", question: "¿Te sientes mentalmente preparado para trabajar de forma segura?" },
];

export async function getFitForWork(): Promise<FitForWork[]> {
  const list = await db.table("fitForWork").toArray();
  return list as FitForWork[];
}

export async function addFitForWork(
  data: Omit<FitForWork, "id" | "creadoEn" | "estado" | "questions">
) {
  const fitForWork: FitForWork = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    estado: "PUBLICADO",
    questions: DEFAULT_QUESTIONS.map((q) => ({ ...q })),
    ...data,
  };

  await db.table("fitForWork").add(fitForWork);
  await addToSyncQueue("fitForWork");

  return fitForWork;
}

export async function getFitForWorkForWorker(workerId: string): Promise<FitForWork[]> {
  const list = (await db.table("fitForWork").toArray()) as FitForWork[];
  return list.filter((f) => f.asignados?.some((a) => a.workerId === workerId));
}

export async function signFitForWork(
  fitForWorkId: string,
  workerId: string,
  firmadoPorNombre: string,
  firmadoPorRut: string,
  responses: FitForWorkQuestion[],
  signatureDataUrl: string,
  geo?: { lat: number; lng: number; accuracy?: number }
) {
  const fitForWork = (await db.table("fitForWork").get(fitForWorkId)) as
    | FitForWork
    | undefined;
  if (!fitForWork) throw new Error("Evaluación Fit-for-Work no encontrada");

  const idx = fitForWork.asignados.findIndex((a) => a.workerId === workerId);
  if (idx === -1)
    throw new Error("Esta evaluación no está asignada a este trabajador");

  const current = fitForWork.asignados[idx];
  if (current.firmadoEn) throw new Error("Esta evaluación ya fue completada");
  if (!signatureDataUrl) throw new Error("Firma requerida");

  const allYes = responses.every((r) => r.response === true);
  const apto = allYes;

  const firmadoEn = new Date();

  const updated: FitForWork = {
    ...fitForWork,
    asignados: fitForWork.asignados.map((a) =>
      a.workerId === workerId
        ? {
            ...a,
            responses,
            firmadoPorNombre,
            firmadoPorRut,
            firmadoEn,
            apto,
            geo,
          }
        : a
    ),
  };

  await db.table("fitForWork").put(updated);
  await addToSyncQueue("fitForWork");

  const updatedAssignment = updated.asignados.find((a) => a.workerId === workerId);
  if (!updatedAssignment || !updatedAssignment.firmadoEn) {
    throw new Error("No se pudo registrar la evaluación");
  }

  await saveSignedFitForWorkPdf({
    fitForWork: updated,
    assignment: updatedAssignment,
    signatureDataUrl,
  });

  return updated;
}
