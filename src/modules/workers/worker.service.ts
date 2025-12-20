import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";
import { saveSignedWorkerEnrollmentPdf } from "./workerEnrollmentPdf.service";

export type Worker = {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  obra: string;
  empresaNombre: string;
  empresaRut: string;
  telefono?: string;
  expuestoA?: {
    alturaFisica?: boolean;
    ruidos?: boolean;
    otros?: boolean;
    otrosDetalle?: string;
  };
  irlAdjunto?: {
    fileName: string;
    mimeType: string;
    blob: Blob;
  };
  aptitudAdjunto?: {
    fileName: string;
    mimeType: string;
    blob: Blob;
  };
  enrolamientoFirmadoEn?: Date;
  enrolamientoToken?: string;
  enrolamientoGeo?: { lat: number; lng: number; accuracy?: number };
  pin: string;
  habilitado: boolean;
  creadoEn: Date;
};

export async function getWorkers(): Promise<Worker[]> {
  return await db.table("workers").toArray();
}

export async function getWorkerById(id: string): Promise<Worker | undefined> {
  return (await db.table("workers").get(id)) as Worker | undefined;
}

export async function getWorkerByPin(pin: string): Promise<Worker | undefined> {
  return await db.table<Worker>("workers").where("pin").equals(pin).first();
}

export async function getWorkerByRut(rut: string): Promise<Worker | undefined> {
  return await db.table<Worker>("workers").where("rut").equals(rut).first();
}

export async function addWorker(
  data: Omit<Worker, "id" | "creadoEn">
) {
  const existingPin = await db
    .table<Worker>("workers")
    .where("pin")
    .equals(data.pin)
    .first();

  if (existingPin) {
    throw new Error("Este PIN ya está en uso. Por favor, elija otro.");
  }

  const existingUserPin = await db
    .table("users")
    .where("pin")
    .equals(data.pin)
    .first();

  if (existingUserPin) {
    throw new Error("Este PIN ya está en uso. Por favor, elija otro.");
  }

  const existingRut = await db
    .table<Worker>("workers")
    .where("rut")
    .equals(data.rut)
    .first();

  if (existingRut) {
    throw new Error("Ya existe un trabajador enrolado con este RUT.");
  }

  const worker: Worker = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    ...data,
  };

  // Guardar localmente (offline)
  await db.table("workers").add(worker);

  // Crear usuario asociado para login como trabajador
  await db.table("users").add({
    id: crypto.randomUUID(),
    name: worker.nombre,
    pin: worker.pin,
    role: "trabajador",
    workerId: worker.id,
    creadoEn: new Date(),
  });

  // 🔄 Agregar a cola de sincronización
  await addToSyncQueue("worker");

  return worker;
}

export async function setWorkerHabilitado(id: string, habilitado: boolean) {
  await db.table("workers").update(id, { habilitado });
  await addToSyncQueue("worker");
}

export async function revertWorkerEnrollment(workerId: string) {
  const worker = (await db.table("workers").get(workerId)) as Worker | undefined;
  if (!worker) return;

  if (worker.enrolamientoFirmadoEn) {
    throw new Error("No se puede revertir: el enrolamiento ya fue firmado");
  }

  await db.table("workers").delete(workerId);
  const user = await db.table("users").where("workerId").equals(workerId).first();
  if (user?.id) {
    await db.table("users").delete(user.id);
  }
}

export async function signWorkerEnrollment(
  workerId: string,
  signatureDataUrl: string,
  geo?: { lat: number; lng: number; accuracy?: number }
) {
  const worker = (await db.table("workers").get(workerId)) as Worker | undefined;
  if (!worker) throw new Error("Trabajador no encontrado");
  if (!worker.irlAdjunto?.blob) throw new Error("Debes adjuntar el IRL antes de firmar");
  if (!worker.aptitudAdjunto?.blob) throw new Error("Debes adjuntar el documento de aptitud antes de firmar");
  if (worker.enrolamientoFirmadoEn) throw new Error("Este enrolamiento ya fue firmado");
  if (!signatureDataUrl) throw new Error("Firma requerida");

  const enrolamientoFirmadoEn = new Date();
  const enrolamientoToken = crypto.randomUUID();

  const updated: Worker = {
    ...worker,
    enrolamientoFirmadoEn,
    enrolamientoToken,
    enrolamientoGeo: geo,
    habilitado: true,
  };

  await db.table("workers").put(updated);
  await addToSyncQueue("worker");

  await saveSignedWorkerEnrollmentPdf({
    worker: updated,
    signatureDataUrl,
  });

  return updated;
}
