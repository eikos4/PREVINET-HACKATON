import { getARTsForWorker } from "../art/art.service";
import { getDocumentsForWorker } from "../documents/documents.service";
import { getFitForWorkForWorker } from "../fitForWork/fitForWork.service";
import { getIRLsForWorker } from "../irl/irl.service";
import { getTalksForWorker } from "../talks/talk.service";

export type WorkerJourneyStepKey = "fitForWork" | "art" | "irl" | "documents" | "talks";

export type WorkerJourneyStatus = {
  workerId: string;
  today: string;
  steps: Record<WorkerJourneyStepKey, { pending: number; total: number }>;
  currentStep: WorkerJourneyStepKey | "done";
};

type ArtAssignmentSlim = { workerId: string; firmadoEn?: Date };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function getWorkerJourneyStatus(workerId: string): Promise<WorkerJourneyStatus> {
  const today = todayISO();

  const [fitsAll, artsAll, irls, docs, talks] = await Promise.all([
    getFitForWorkForWorker(workerId),
    getARTsForWorker(workerId),
    getIRLsForWorker(workerId),
    getDocumentsForWorker(workerId),
    getTalksForWorker(workerId),
  ]);

  const fits = fitsAll.filter((f) => f.fecha === today);
  const fitsTotal = fits.reduce((acc, f) => acc + (f.asignados?.filter((a) => a.workerId === workerId).length ?? 0), 0);
  const fitsPending = fits.reduce((acc, f) => {
    const assignment = f.asignados?.find((a) => a.workerId === workerId);
    return acc + (assignment && !assignment.firmadoEn ? 1 : 0);
  }, 0);

  const arts = artsAll.filter((a) => a.fecha === today);
  const artsTotal = arts.reduce((acc, a) => {
    const assignments: ArtAssignmentSlim[] =
      a.asignados && a.asignados.length > 0
        ? a.asignados
        : (a.trabajadores ?? []).map((id) => ({ workerId: id, firmadoEn: undefined }));
    return acc + assignments.filter((x) => x.workerId === workerId).length;
  }, 0);
  const artsPending = arts.reduce((acc, a) => {
    const assignments: ArtAssignmentSlim[] =
      a.asignados && a.asignados.length > 0
        ? a.asignados
        : (a.trabajadores ?? []).map((id) => ({ workerId: id, firmadoEn: undefined }));
    const assignment = assignments.find((x) => x.workerId === workerId);
    return acc + (assignment && !assignment.firmadoEn ? 1 : 0);
  }, 0);

  const irlTotal = irls.reduce((acc, i) => acc + (i.asignados?.filter((a) => a.workerId === workerId).length ?? 0), 0);
  const irlPending = irls.reduce((acc, i) => {
    const assignment = i.asignados?.find((a) => a.workerId === workerId);
    return acc + (assignment && !assignment.firmadoEn ? 1 : 0);
  }, 0);

  const docsTotal = docs.reduce((acc, d) => acc + (d.asignados?.filter((a) => a.workerId === workerId).length ?? 0), 0);
  const docsPending = docs.reduce((acc, d) => {
    const assignment = d.asignados?.find((a) => a.workerId === workerId);
    return acc + (assignment && !assignment.firmadoEn ? 1 : 0);
  }, 0);

  const talksTotal = talks.reduce((acc, t) => acc + (t.asignados?.filter((a) => a.workerId === workerId).length ?? 0), 0);
  const talksPending = talks.reduce((acc, t) => {
    const assignment = t.asignados?.find((a) => a.workerId === workerId);
    return acc + (assignment && !assignment.firmadoEn ? 1 : 0);
  }, 0);

  const steps: WorkerJourneyStatus["steps"] = {
    fitForWork: { pending: fitsPending, total: fitsTotal },
    art: { pending: artsPending, total: artsTotal },
    irl: { pending: irlPending, total: irlTotal },
    documents: { pending: docsPending, total: docsTotal },
    talks: { pending: talksPending, total: talksTotal },
  };

  const order: WorkerJourneyStepKey[] = ["fitForWork", "art", "irl", "documents", "talks"];
  const currentStep = order.find((k) => steps[k].pending > 0) ?? "done";

  return {
    workerId,
    today,
    steps,
    currentStep,
  };
}

export function isWorkerJourneySectionAllowed(
  status: WorkerJourneyStatus | null,
  section: string
): boolean {
  if (!status) return true;
  if (section === "inicio" || section === "profile") return true;

  const order: WorkerJourneyStepKey[] = ["fitForWork", "art", "irl", "documents", "talks"];
  const map: Record<string, WorkerJourneyStepKey> = {
    fitForWork: "fitForWork",
    art: "art",
    irl: "irl",
    documents: "documents",
    talks: "talks",
  };

  const stepKey = map[section];
  if (!stepKey) return true;

  if (status.currentStep === "done") return true;

  const currentIdx = order.indexOf(status.currentStep);
  const requestedIdx = order.indexOf(stepKey);
  return requestedIdx <= currentIdx;
}
