import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";
import { saveSignedIrlPdf } from "./irlPdf.service";

export type IRLVerificationQuestion = {
  id: "q1" | "q2";
  question: string;
  expectedAnswer: string;
};

export function getIRLVerificationQuestions(irl: IRL): IRLVerificationQuestion[] {
  const q2Expected = irl.attachment?.fileName ? irl.attachment.fileName : irl.titulo;
  return [
    {
      id: "q1",
      question: "¿Cuál es la obra / faena indicada en el IRL?",
      expectedAnswer: irl.obra,
    },
    {
      id: "q2",
      question: irl.attachment?.fileName
        ? "¿Cuál es el nombre del archivo adjunto?"
        : "¿Cuál es el título del IRL?",
      expectedAnswer: q2Expected,
    },
  ];
}

function normalizeAnswer(value: string) {
  return (value ?? "").trim().toLowerCase();
}

export type IRLWorkerAssignment = {
  workerId: string;
  token: string;
  verificationAnswers?: {
    q1: string;
    q2: string;
  };
  verificationAt?: Date;
  firmadoPorNombre?: string;
  firmadoPorRut?: string;
  firmadoEn?: Date;
  geo?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
};

export type IRL = {
  id: string;
  obra: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  estado: "PUBLICADO";
  asignados: IRLWorkerAssignment[];
  verificationQuestions?: IRLVerificationQuestion[];
  attachment?: {
    fileName: string;
    mimeType: string;
    blob: Blob;
  };
  creadoPorUserId?: string;
  creadoEn: Date;
};

export async function getIRLs(): Promise<IRL[]> {
  const list = await db.table("irl").toArray();
  return list as IRL[];
}

export async function addIRL(
  data: Omit<IRL, "id" | "creadoEn" | "estado">
) {
  const irl: IRL = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    estado: "PUBLICADO",
    ...data,
  };

  await db.table("irl").add(irl);
  await addToSyncQueue("irl");

  return irl;
}

export async function getIRLsForWorker(workerId: string): Promise<IRL[]> {
  const list = (await db.table("irl").toArray()) as IRL[];
  return list.filter((i) => i.asignados?.some((a) => a.workerId === workerId));
}

export async function signIRL(
  irlId: string,
  workerId: string,
  firmadoPorNombre: string,
  firmadoPorRut: string,
  verificationAnswers: { q1: string; q2: string },
  verificationAt: Date,
  signatureDataUrl: string,
  geo?: { lat: number; lng: number; accuracy?: number }
) {
  const irl = (await db.table("irl").get(irlId)) as IRL | undefined;
  if (!irl) throw new Error("IRL no encontrado");

  const idx = irl.asignados.findIndex((a) => a.workerId === workerId);
  if (idx === -1) throw new Error("Este IRL no está asignado a este trabajador");

  const current = irl.asignados[idx];
  if (current.firmadoEn) throw new Error("Este IRL ya fue firmado");
  if (!verificationAnswers) throw new Error("Debes responder las preguntas antes de firmar");
  if (!verificationAt) throw new Error("Confirmación requerida");
  if (!signatureDataUrl) throw new Error("Firma requerida");

  const questions =
    irl.verificationQuestions && irl.verificationQuestions.length === 2
      ? irl.verificationQuestions
      : getIRLVerificationQuestions(irl);

  const expectedQ1 = normalizeAnswer(questions.find((q) => q.id === "q1")?.expectedAnswer || "");
  const expectedQ2 = normalizeAnswer(questions.find((q) => q.id === "q2")?.expectedAnswer || "");
  const givenQ1 = normalizeAnswer(verificationAnswers.q1);
  const givenQ2 = normalizeAnswer(verificationAnswers.q2);

  if (!givenQ1 || !givenQ2) {
    throw new Error("Debes responder ambas preguntas antes de firmar");
  }

  if (givenQ1 !== expectedQ1 || givenQ2 !== expectedQ2) {
    throw new Error("Respuestas incorrectas. Revisa el IRL antes de firmar");
  }

  const firmadoEn = new Date();

  const updated: IRL = {
    ...irl,
    asignados: irl.asignados.map((a) =>
      a.workerId === workerId
        ? {
            ...a,
            verificationAnswers,
            verificationAt,
            firmadoPorNombre,
            firmadoPorRut,
            firmadoEn,
            geo,
          }
        : a
    ),
  };

  await db.table("irl").put(updated);
  await addToSyncQueue("irl");

  const updatedAssignment = updated.asignados.find((a) => a.workerId === workerId);
  if (!updatedAssignment || !updatedAssignment.firmadoEn) {
    throw new Error("No se pudo registrar la firma");
  }

  await saveSignedIrlPdf({
    irl: updated,
    assignment: updatedAssignment,
    signatureDataUrl,
  });

  return updated;
}
