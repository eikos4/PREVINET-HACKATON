import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";
import { saveSignedTalkPdf } from "./talkPdf.service";

export type TalkWorkerAssignment = {
  workerId: string;
  token: string;
  firmadoPorNombre?: string;
  firmadoPorRut?: string;
  firmadoEn?: Date;
  geo?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
};

export type Talk = {
  id: string;
  tema: string;
  fechaHora: string;
  estado: "PUBLICADO";
  asignados: TalkWorkerAssignment[];
  creadoPorUserId?: string;
  creadoEn: Date;
};

export async function getTalks(): Promise<Talk[]> {
  const list = await db.table("talks").toArray();
  return list as Talk[];
}

export async function addTalk(data: Omit<Talk, "id" | "creadoEn" | "estado">) {
  const talk: Talk = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    estado: "PUBLICADO",
    ...data,
  };

  await db.table("talks").add(talk);
  await addToSyncQueue("talk");

  return talk;
}

export async function getTalksForWorker(workerId: string): Promise<Talk[]> {
  const list = (await db.table("talks").toArray()) as Talk[];
  return list.filter((t) => t.asignados?.some((a) => a.workerId === workerId));
}

export async function signTalk(
  talkId: string,
  workerId: string,
  firmadoPorNombre: string,
  firmadoPorRut: string,
  signatureDataUrl: string,
  geo?: { lat: number; lng: number; accuracy?: number }
) {
  const talk = (await db.table("talks").get(talkId)) as Talk | undefined;
  if (!talk) throw new Error("Charla no encontrada");

  const idx = talk.asignados.findIndex((a) => a.workerId === workerId);
  if (idx === -1) throw new Error("Esta charla no está asignada a este trabajador");

  const current = talk.asignados[idx];
  if (current.firmadoEn) throw new Error("Esta charla ya fue firmada");
  if (!signatureDataUrl) throw new Error("Firma requerida");

  const firmadoEn = new Date();

  const updated: Talk = {
    ...talk,
    asignados: talk.asignados.map((a) =>
      a.workerId === workerId
        ? {
            ...a,
            firmadoPorNombre,
            firmadoPorRut,
            firmadoEn,
            geo,
          }
        : a
    ),
  };

  await db.table("talks").put(updated);
  await addToSyncQueue("talk");

  const updatedAssignment = updated.asignados.find((a) => a.workerId === workerId);
  if (!updatedAssignment || !updatedAssignment.firmadoEn) {
    throw new Error("No se pudo registrar la firma");
  }

  await saveSignedTalkPdf({
    talk: updated,
    assignment: updatedAssignment,
    signatureDataUrl,
  });

  return updated;
}
