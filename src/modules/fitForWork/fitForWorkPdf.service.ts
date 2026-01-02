import { jsPDF } from "jspdf";
import { db } from "../../offline/db";
import type { FitForWork, FitForWorkWorkerAssignment } from "./fitForWork.service";

export type FitForWorkSignedPdfRecord = {
  id: string;
  fitForWorkId: string;
  workerId: string;
  token: string;
  fileName: string;
  mimeType: "application/pdf";
  pdf: Blob;
  createdAt: Date;
};

export function buildSignedFitForWorkPdfFileName(params: {
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

  return `FIT_FOR_WORK_${safeName}_${safeRut}_${ts}_${safeToken}.pdf`;
}

export async function generateSignedFitForWorkPdf(params: {
  fitForWork: FitForWork;
  assignment: FitForWorkWorkerAssignment;
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
  doc.text("Evaluación Fit-for-Work (Apto para Trabajar)", marginX, y);
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

  line("Fecha", formatDateSafe(params.fitForWork.fecha));
  line("Turno", params.fitForWork.turno.toUpperCase());
  if (params.fitForWork.obra) {
    line("Obra/Faena", params.fitForWork.obra);
  }

  y += 2;
  doc.setDrawColor(200);
  doc.line(marginX, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Cuestionario de Aptitud", marginX, y);
  y += 8;

  doc.setFontSize(10);
  if (params.assignment.responses) {
    params.assignment.responses.forEach((q, idx) => {
      const response = q.response ? "SI" : "NO";
      const color = q.response ? [34, 197, 94] : [239, 68, 68];
      
      doc.setFont("helvetica", "normal");
      doc.text(`${idx + 1}. ${q.question}`, marginX, y);
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(response, marginX + 5, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    });
  }

  y += 2;
  doc.setDrawColor(200);
  doc.line(marginX, y, 196, y);
  y += 8;

  const apto = params.assignment.apto ?? false;
  const aptoText = apto ? "APTO PARA TRABAJAR" : "NO APTO PARA TRABAJAR";
  const aptoColor = apto ? [34, 197, 94] : [239, 68, 68];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(aptoColor[0], aptoColor[1], aptoColor[2]);
  doc.text(aptoText, marginX, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFontSize(11);
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

export async function saveSignedFitForWorkPdf(params: {
  fitForWork: FitForWork;
  assignment: FitForWorkWorkerAssignment;
  signatureDataUrl: string;
}) {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma");
  }

  const pdf = await generateSignedFitForWorkPdf(params);

  const fileName = buildSignedFitForWorkPdfFileName({
    workerName: params.assignment.firmadoPorNombre ?? "trabajador",
    workerRut: params.assignment.firmadoPorRut ?? "",
    firmadoEn: params.assignment.firmadoEn,
    token: params.assignment.token,
  });

  const id = `${params.fitForWork.id}_${params.assignment.workerId}_${params.assignment.token}`;

  const record: FitForWorkSignedPdfRecord = {
    id,
    fitForWorkId: params.fitForWork.id,
    workerId: params.assignment.workerId,
    token: params.assignment.token,
    fileName,
    mimeType: "application/pdf",
    pdf,
    createdAt: new Date(),
  };

  await db.table("fitForWorkSignedPdfs").put(record);
  return record;
}

export async function getSignedFitForWorkPdfByKey(params: {
  fitForWorkId: string;
  workerId: string;
  token: string;
}): Promise<FitForWorkSignedPdfRecord | undefined> {
  const id = `${params.fitForWorkId}_${params.workerId}_${params.token}`;
  return (await db.table("fitForWorkSignedPdfs").get(id)) as
    | FitForWorkSignedPdfRecord
    | undefined;
}

export async function listSignedFitForWorkPdfsForEvaluation(
  fitForWorkId: string
): Promise<FitForWorkSignedPdfRecord[]> {
  const all = (await db
    .table("fitForWorkSignedPdfs")
    .where("fitForWorkId")
    .equals(fitForWorkId)
    .toArray()) as FitForWorkSignedPdfRecord[];
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

function formatDateSafe(date: string) {
  try {
    return new Date(date).toLocaleDateString("es-CL");
  } catch {
    return date;
  }
}
