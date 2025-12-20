import { jsPDF } from "jspdf";
import { db } from "../../offline/db";
import type { Talk, TalkWorkerAssignment } from "./talk.service";

export type TalkSignedPdfRecord = {
  id: string;
  talkId: string;
  workerId: string;
  token: string;
  fileName: string;
  mimeType: "application/pdf";
  pdf: Blob;
  createdAt: Date;
};

export function buildSignedTalkPdfFileName(params: {
  workerName: string;
  workerRut: string;
  firmadoEn: Date;
  token: string;
}) {
  const safeName = (params.workerName || "trabajador")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");

  const safeRut = (params.workerRut || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9kK\-]/g, "");

  const d = new Date(params.firmadoEn);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const safeToken = (params.token || "")
    .trim()
    .replace(/[^a-zA-Z0-9\-]/g, "");

  return `CHARLA_${safeName}_${safeRut}_${ts}_${safeToken}.pdf`;
}

export async function generateSignedTalkPdf(params: {
  talk: Talk;
  assignment: TalkWorkerAssignment;
  signatureDataUrl: string;
}) {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma para generar el PDF");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const marginX = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Charla diaria (5 minutos)", marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    const textX = marginX + 35;
    const wrapped = doc.splitTextToSize(value || "-", 180 - textX);
    doc.text(wrapped, textX, y);
    y += 7 + (wrapped.length - 1) * 5;
  };

  line("Tema", params.talk.tema);
  line("Fecha/Hora charla", formatDateTimeSafe(params.talk.fechaHora));

  y += 2;
  doc.setDrawColor(200);
  doc.line(marginX, y, 196, y);
  y += 8;

  const firmadoEnStr = new Date(params.assignment.firmadoEn).toLocaleString("es-CL");
  line("Firmado por", params.assignment.firmadoPorNombre ?? "-");
  line("RUT", params.assignment.firmadoPorRut ?? "-");
  line("Fecha/Hora", firmadoEnStr);
  line("Token", params.assignment.token);

  if (params.assignment.geo) {
    const geo = params.assignment.geo;
    const geoStr = `lat ${geo.lat}, lng ${geo.lng}${geo.accuracy ? ` (±${geo.accuracy}m)` : ""}`;
    line("Geolocalización", geoStr);
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Firma del trabajador", marginX, y);
  y += 6;

  const sigBoxW = 170;
  const sigBoxH = 45;
  doc.setDrawColor(150);
  doc.rect(marginX, y, sigBoxW, sigBoxH);

  try {
    const imgW = sigBoxW - 4;
    const imgH = sigBoxH - 4;
    doc.addImage(params.signatureDataUrl, "PNG", marginX + 2, y + 2, imgW, imgH);
  } catch {
    doc.setFont("helvetica", "normal");
    doc.text("(No se pudo incrustar la imagen de la firma)", marginX + 3, y + 12);
  }

  const blob = doc.output("blob");
  return blob;
}

export async function saveSignedTalkPdf(params: {
  talk: Talk;
  assignment: TalkWorkerAssignment;
  signatureDataUrl: string;
}) {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma");
  }

  const pdf = await generateSignedTalkPdf(params);

  const fileName = buildSignedTalkPdfFileName({
    workerName: params.assignment.firmadoPorNombre ?? "trabajador",
    workerRut: params.assignment.firmadoPorRut ?? "",
    firmadoEn: params.assignment.firmadoEn,
    token: params.assignment.token,
  });

  const id = `${params.talk.id}_${params.assignment.workerId}_${params.assignment.token}`;

  const record: TalkSignedPdfRecord = {
    id,
    talkId: params.talk.id,
    workerId: params.assignment.workerId,
    token: params.assignment.token,
    fileName,
    mimeType: "application/pdf",
    pdf,
    createdAt: new Date(),
  };

  await db.table("talkSignedPdfs").put(record);
  return record;
}

export async function getSignedTalkPdfByKey(params: {
  talkId: string;
  workerId: string;
  token: string;
}): Promise<TalkSignedPdfRecord | undefined> {
  const id = `${params.talkId}_${params.workerId}_${params.token}`;
  return (await db.table("talkSignedPdfs").get(id)) as TalkSignedPdfRecord | undefined;
}

export async function listSignedTalkPdfsForTalk(talkId: string): Promise<TalkSignedPdfRecord[]> {
  const all = (await db.table("talkSignedPdfs").where("talkId").equals(talkId).toArray()) as TalkSignedPdfRecord[];
  return all;
}

export function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatDateTimeSafe(date: string) {
  try {
    return new Date(date).toLocaleString("es-CL");
  } catch {
    return date;
  }
}
