import { db } from "../../offline/db";
import { addToSyncQueue } from "../../services/sync.service";

export type Report = {
  id: string;
  obra: string;
  categoria: string;
  descripcion: string;
  estado: "REPORTADO" | "CERRADO";
  creadoEn: Date;
};

export async function getReports(): Promise<Report[]> {
  return await db.table("reports").toArray();
}

export async function addReport(
  data: Omit<Report, "id" | "creadoEn" | "estado">
) {
  const report: Report = {
    id: crypto.randomUUID(),
    creadoEn: new Date(),
    estado: "REPORTADO",
    ...data,
  };

  // ⚠️ Guardar reporte localmente (offline)
  await db.table("reports").add(report);

  // 🔄 Agregar a cola de sincronización
  await addToSyncQueue("report");

  return report;
}
