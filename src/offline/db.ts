import Dexie from "dexie";

export const db = new Dexie("previnet");

db.version(10).stores({
  users: "id, pin, role, workerId",
  workers: "id, rut, pin, obra",
  art: "id, fecha, synced",
  reports: "id, estado, synced",
  irl: "id, fecha, obra, estado",
  talks: "id, fechaHora, estado",
  fitForWork: "id, fecha, turno, estado",
  findingIncidents: "id, tipo, estado, obra, fecha, creadoEn, creadoPorUserId",
  documents: "id, fecha, obra, estado, creadoEn, creadoPorUserId",
  evidences: "id, ref",
  irlSignedPdfs: "id, irlId, workerId, token, createdAt",
  artSignedPdfs: "id, artId, workerId, token, createdAt",
  talkSignedPdfs: "id, talkId, workerId, token, createdAt",
  fitForWorkSignedPdfs: "id, fitForWorkId, workerId, token, createdAt",
  documentSignedPdfs: "id, documentId, workerId, token, createdAt",
  workerEnrollmentSignedPdfs: "id, workerId, token, createdAt",
  syncQueue: "++id, type, created_at"
});
