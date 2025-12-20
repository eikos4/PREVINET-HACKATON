import { db } from "../offline/db";

export type SyncItem = {
  type:
    | "worker"
    | "art"
    | "report"
    | "irl"
    | "talk"
    | "fitForWork"
    | "findingIncident"
    | "document";
  createdAt: Date;
};

export async function addToSyncQueue(type: SyncItem["type"]) {
  await db.table("syncQueue").add({
    type,
    createdAt: new Date(),
  });
}

export async function getPendingSyncCount(): Promise<number> {
  return await db.table("syncQueue").count();
}

export async function flushSyncQueue() {
  const items = await db.table("syncQueue").toArray();

  // 🧠 Simulación de envío
  console.log("📡 Sincronizando con servidor:", items);

  // Simula delay de red
  await new Promise((res) => setTimeout(res, 1000));

  await db.table("syncQueue").clear();
}
