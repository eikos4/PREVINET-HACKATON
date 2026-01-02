import { jsPDF } from "jspdf";
import { db } from "../../offline/db";
import type { IRL, IRLWorkerAssignment } from "./irl.service";

export type IRLSignedPdfRecord = {
  id: string;
  irlId: string;
  workerId: string;
  token: string;
  fileName: string;
  mimeType: "application/pdf";
  pdf: Blob;
  createdAt: Date;
};

export function buildSignedIrlPdfFileName(params: {
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

  return `${safeName}_${safeRut}_${ts}_${safeToken}.pdf`;
}

export async function generateSignedIrlPdf(params: {
  irl: IRL;
  assignment: IRLWorkerAssignment;
  signatureDataUrl: string;
}) {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma para generar el PDF");
  }

  if (params.irl.attachment?.blob && params.irl.attachment.mimeType === "application/pdf") {
    try {
      return await stampSignatureOnPdfAttachment({
        attachmentPdf: params.irl.attachment.blob,
        attachmentFileName: params.irl.attachment.fileName,
        assignment: params.assignment,
        signatureDataUrl: params.signatureDataUrl,
      });
    } catch {
      // Fallback: mantener flujo funcional (PDF certificado) si falla el estampado del PDF adjunto
    }
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const marginX = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IRL - Inspección / Registro en Línea", marginX, y);
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

  line("Obra/Faena", params.irl.obra);
  line("Fecha IRL", params.irl.fecha);
  line("Título", params.irl.titulo);
  line("Descripción", params.irl.descripcion);

  if (params.irl.attachment?.fileName) {
    const mime = params.irl.attachment.mimeType || "application/octet-stream";
    line("Documento adjunto", `${params.irl.attachment.fileName} (${mime})`);
  }

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

async function stampSignatureOnPdfAttachment(params: {
  attachmentPdf: Blob;
  attachmentFileName: string;
  assignment: IRLWorkerAssignment;
  signatureDataUrl: string;
}): Promise<Blob> {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma");
  }

  const mod = (await import("pdf-lib")) as unknown as {
    PDFDocument: any;
    rgb: any;
    StandardFonts: any;
  };

  const PDFDocument = mod.PDFDocument;
  const rgb = mod.rgb;
  const StandardFonts = mod.StandardFonts;

  const pdfBytes = new Uint8Array(await params.attachmentPdf.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("El PDF adjunto no tiene páginas");
  }

  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const pngBytes = dataUrlToUint8Array(params.signatureDataUrl);
  const signatureImg = await pdfDoc.embedPng(pngBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Caja de firma en esquina inferior derecha
  const margin = 36;
  const boxW = 200;
  const boxH = 160;
  const x = Math.max(margin, width - margin - boxW);
  const y = margin;

  lastPage.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
    color: rgb(1, 1, 1),
    opacity: 0.92,
  });

  const pad = 10;
  const headerY = y + boxH - 18;
  const nameY = headerY - 16;
  const rutY = nameY - 13;
  const dateY = rutY - 13;

  lastPage.drawText("Firma", {
    x: x + pad,
    y: headerY,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });

  const name = params.assignment.firmadoPorNombre ?? "-";
  const rut = params.assignment.firmadoPorRut ?? "-";
  const when = new Date(params.assignment.firmadoEn).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  lastPage.drawText(name, {
    x: x + pad,
    y: nameY,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
    maxWidth: boxW - pad * 2,
  });

  lastPage.drawText(`RUT: ${rut}`, {
    x: x + pad,
    y: rutY,
    size: 9,
    font,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: boxW - pad * 2,
  });

  lastPage.drawText(`Fecha/Hora: ${when}`, {
    x: x + pad,
    y: dateY,
    size: 9,
    font,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: boxW - pad * 2,
  });

  const tokenShort = shortenToken(params.assignment.token);
  const tokenY = y + pad;
  const sigY = tokenY + 14;
  const imgMaxW = boxW - pad * 2;
  const imgMaxH = 62;
  const scaled = signatureImg.scale(1);
  const scale = Math.min(imgMaxW / scaled.width, imgMaxH / scaled.height);
  const imgW = scaled.width * scale;
  const imgH = scaled.height * scale;

  lastPage.drawText(`Token: ${tokenShort}`, {
    x: x + pad,
    y: tokenY,
    size: 7,
    font,
    color: rgb(0.35, 0.35, 0.35),
    maxWidth: boxW - pad * 2,
  });

  lastPage.drawImage(signatureImg, {
    x: x + pad,
    y: sigY,
    width: imgW,
    height: imgH,
    opacity: 1,
  });

  const stamped = await pdfDoc.save();
  const stampedU8 = Uint8Array.from(stamped);
  return new Blob([stampedU8], { type: "application/pdf" });
}

function dataUrlToUint8Array(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function shortenToken(token: string, head = 8, tail = 6) {
  const t = (token || "").trim();
  if (t.length <= head + tail + 3) return t;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}

function buildSignedAttachmentFileName(params: { originalFileName: string; token: string }) {
  const name = params.originalFileName || "documento.pdf";
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : ".pdf";
  const safeBase = base.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
  const safeToken = (params.token || "").trim().replace(/[^a-zA-Z0-9\-]/g, "");
  return `${safeBase}_FIRMADO_${safeToken}${ext}`;
}

export async function saveSignedIrlPdf(params: {
  irl: IRL;
  assignment: IRLWorkerAssignment;
  signatureDataUrl: string;
}) {
  if (!params.assignment.firmadoEn) {
    throw new Error("No hay fecha de firma");
  }

  const pdf = await generateSignedIrlPdf(params);

  const fileName =
    params.irl.attachment?.fileName && params.irl.attachment.mimeType === "application/pdf"
      ? buildSignedAttachmentFileName({
          originalFileName: params.irl.attachment.fileName,
          token: params.assignment.token,
        })
      : buildSignedIrlPdfFileName({
          workerName: params.assignment.firmadoPorNombre ?? "trabajador",
          workerRut: params.assignment.firmadoPorRut ?? "",
          firmadoEn: params.assignment.firmadoEn,
          token: params.assignment.token,
        });

  const id = `${params.irl.id}_${params.assignment.workerId}_${params.assignment.token}`;

  const record: IRLSignedPdfRecord = {
    id,
    irlId: params.irl.id,
    workerId: params.assignment.workerId,
    token: params.assignment.token,
    fileName,
    mimeType: "application/pdf",
    pdf,
    createdAt: new Date(),
  };

  await db.table("irlSignedPdfs").put(record);
  return record;
}

export async function getSignedIrlPdfByKey(params: {
  irlId: string;
  workerId: string;
  token: string;
}): Promise<IRLSignedPdfRecord | undefined> {
  const id = `${params.irlId}_${params.workerId}_${params.token}`;
  return (await db.table("irlSignedPdfs").get(id)) as IRLSignedPdfRecord | undefined;
}

export async function listSignedIrlPdfsForIrl(irlId: string): Promise<IRLSignedPdfRecord[]> {
  const all = (await db.table("irlSignedPdfs").where("irlId").equals(irlId).toArray()) as IRLSignedPdfRecord[];
  return all;
}

export async function listAllSignedIrlPdfs(): Promise<IRLSignedPdfRecord[]> {
  return (await db.table("irlSignedPdfs").toArray()) as IRLSignedPdfRecord[];
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
