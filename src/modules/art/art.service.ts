import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";
import { saveSignedArtPdf } from "./artPdf.service";

export type ARTVerificationQuestion = {
  id: "q1" | "q2";
  question: string;
  options: string[];
  correctOptionIndex: number;
};

export type ARTWorkerAssignment = {
  workerId: string;
  token: string;
  firmadoPorNombre?: string;
  firmadoPorRut?: string;
  firmadoEn?: Date;
  verificationAnswers?: { q1: number; q2: number };
  verificationAt?: Date;
  geo?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
};

export type ART = {
  id: string;
  obra: string;
  fecha: string;
  trabajadores: string[];
  asignados?: ARTWorkerAssignment[];
  riesgos: string;
  verificationQuestions?: ARTVerificationQuestion[];
  attachment?: {
    fileName: string;
    mimeType: string;
    blob: Blob;
  };
  cerrado: boolean;
  creadoPorUserId?: string;
  creadoEn: Date;
};

export async function getARTs(): Promise<ART[]> {
  return await db.table("art").toArray();
}

export async function addART(
  data: Omit<ART, "id" | "creadoEn">
) {
  const art: ART = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    ...data,
  };

  // 📝 Guardar ART localmente (offline)
  await db.table("art").add(art);

  // 🔄 Agregar a cola de sincronización
  await addToSyncQueue("art");

  return art;
}

export async function getARTsForWorker(workerId: string): Promise<ART[]> {
  const list = (await db.table("art").toArray()) as ART[];
  return list.filter((a) => {
    if (a.asignados?.some((x) => x.workerId === workerId)) return true;
    if (a.trabajadores?.includes(workerId)) return true;
    return false;
  });
}

export async function signART(
  artId: string,
  workerId: string,
  firmadoPorNombre: string,
  firmadoPorRut: string,
  verificationParams: { answers: { q1: number; q2: number }; verificationAt: Date } | undefined,
  signatureDataUrl: string,
  geo?: { lat: number; lng: number; accuracy?: number }
) {
  const art = (await db.table("art").get(artId)) as ART | undefined;
  if (!art) throw new Error("ART no encontrado");

  const assignments: ARTWorkerAssignment[] =
    art.asignados && art.asignados.length > 0
      ? art.asignados
      : (art.trabajadores ?? []).map((id) => ({
          workerId: id,
          token: crypto.randomUUID(),
        }));

  const idx = assignments.findIndex((a) => a.workerId === workerId);
  if (idx === -1) throw new Error("Este ART no está asignado a este trabajador");

  const current = assignments[idx];
  if (current.firmadoEn) throw new Error("Este ART ya fue firmado");
  if (!signatureDataUrl) throw new Error("Firma requerida");

  const hasQuestions = !!art.verificationQuestions && art.verificationQuestions.length === 2;
  if (hasQuestions) {
    if (!verificationParams?.answers || !verificationParams.verificationAt) {
      throw new Error("Debes responder las preguntas antes de firmar");
    }

    const q1 = art.verificationQuestions!.find((q) => q.id === "q1");
    const q2 = art.verificationQuestions!.find((q) => q.id === "q2");

    if (!q1 || !q2) {
      throw new Error("Preguntas de verificación inválidas");
    }

    if (
      verificationParams.answers.q1 !== q1.correctOptionIndex ||
      verificationParams.answers.q2 !== q2.correctOptionIndex
    ) {
      throw new Error("Respuestas incorrectas. Revisa el documento antes de firmar");
    }
  }

  const firmadoEn = new Date();

  const updated: ART = {
    ...art,
    trabajadores: art.trabajadores ?? assignments.map((a) => a.workerId),
    asignados: assignments.map((a) =>
      a.workerId === workerId
        ? {
            ...a,
            firmadoPorNombre,
            firmadoPorRut,
            firmadoEn,
            verificationAnswers: hasQuestions ? verificationParams!.answers : undefined,
            verificationAt: hasQuestions ? verificationParams!.verificationAt : undefined,
            geo,
          }
        : a
    ),
  };

  await db.table("art").put(updated);
  await addToSyncQueue("art");

  const updatedAssignment = updated.asignados?.find((a) => a.workerId === workerId);
  if (!updatedAssignment || !updatedAssignment.firmadoEn) {
    throw new Error("No se pudo registrar la firma");
  }

  await saveSignedArtPdf({
    art: updated,
    assignment: updatedAssignment,
    signatureDataUrl,
  });

  return updated;
}
