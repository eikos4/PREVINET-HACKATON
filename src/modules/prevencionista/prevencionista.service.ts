import { getWorkerById, getWorkers } from "../workers/worker.service";
import type { Worker } from "../workers/worker.service";
import { getDocumentsForWorker } from "../documents/documents.service";
import type { DocumentRecord } from "../documents/documents.service";
import { getIRLsForWorker } from "../irl/irl.service";
import type { IRL } from "../irl/irl.service";
import { getTalksForWorker } from "../talks/talk.service";
import type { Talk } from "../talks/talk.service";
import { getFitForWorkForWorker } from "../fitForWork/fitForWork.service";
import type { FitForWork } from "../fitForWork/fitForWork.service";
import { getARTsForWorker } from "../art/art.service";
import type { ART } from "../art/art.service";
import { getFindingIncidents } from "../findingIncidents/findingIncident.service";
import type { FindingIncident } from "../findingIncidents/findingIncident.service";

export interface WorkerActivity {
  id: string;
  type: 'document' | 'irl' | 'talk' | 'fitForWork' | 'art' | 'findingIncident';
  title: string;
  date: Date;
  description: string;
  status?: string;
  workerId: string;
  metadata?: Record<string, any>;
}

export interface WorkerTimelineData {
  worker: Worker;
  activities: WorkerActivity[];
  documents: DocumentRecord[];
  irls: IRL[];
  talks: Talk[];
  fitForWork: FitForWork[];
  arts: ART[];
  findingIncidents: FindingIncident[];
}

 function safeDate(dateStr: string | undefined, fallback: Date) {
   if (!dateStr) return fallback;
   const d = new Date(dateStr);
   return Number.isNaN(d.getTime()) ? fallback : d;
 }

export async function getWorkerTimeline(workerId: string): Promise<WorkerTimelineData> {
  try {
    const [
      worker,
      documents,
      irls,
      talks,
      fitForWork,
      arts,
      findingIncidents
    ] = await Promise.all([
      getWorkerById(workerId),
      getDocumentsForWorker(workerId),
      getIRLsForWorker(workerId),
      getTalksForWorker(workerId),
      getFitForWorkForWorker(workerId),
      getARTsForWorker(workerId),
      getFindingIncidents()
    ]);

    if (!worker) {
      throw new Error('Trabajador no encontrado');
    }

    // Filtrar finding incidents relacionados con el trabajador
    const workerFindingIncidents = findingIncidents.filter((incident) => {
      const personas = (incident.personasInvolucradas ?? "").toString();
      const involved = personas.includes(workerId);
      const sameWorksite = incident.obra === worker.obra;
      return involved || sameWorksite;
    });

    // Convertir todas las actividades a formato unificado
    const activities: WorkerActivity[] = [];

    // Documentos
    documents.forEach((doc) => {
      activities.push({
        id: doc.id,
        type: 'document',
        title: doc.titulo,
        date: safeDate(doc.fecha, doc.creadoEn),
        description: doc.descripcion || doc.titulo,
        status: doc.estado,
        workerId,
        metadata: { document: doc }
      });
    });

    // IRLs
    irls.forEach((irl) => {
      activities.push({
        id: irl.id,
        type: 'irl',
        title: `IRL - ${irl.titulo}`,
        date: safeDate(irl.fecha, irl.creadoEn),
        description: irl.descripcion || irl.titulo,
        status: irl.estado,
        workerId,
        metadata: { irl }
      });
    });

    // Charlas
    talks.forEach((talk) => {
      activities.push({
        id: talk.id,
        type: 'talk',
        title: `Charla - ${talk.tema}`,
        date: safeDate(talk.fechaHora, talk.creadoEn),
        description: talk.tema,
        status: talk.estado,
        workerId,
        metadata: { talk }
      });
    });

    // Fit-for-Work
    fitForWork.forEach((ffw) => {
      activities.push({
        id: ffw.id,
        type: 'fitForWork',
        title: `Fit-for-Work (${ffw.turno})`,
        date: safeDate(ffw.fecha, ffw.creadoEn),
        description: ffw.obra ? `Obra: ${ffw.obra}` : "Evaluación de aptitud laboral",
        status: ffw.estado,
        workerId,
        metadata: { fitForWork: ffw }
      });
    });

    // ART/AST
    arts.forEach((art) => {
      activities.push({
        id: art.id,
        type: 'art',
        title: `ART/AST - ${art.obra}`,
        date: safeDate(art.fecha, art.creadoEn),
        description: art.riesgos || "Análisis de riesgo laboral",
        status: art.cerrado ? "CERRADO" : "ABIERTO",
        workerId,
        metadata: { art }
      });
    });

    // Hallazgos/Incidencias
    workerFindingIncidents.forEach((incident) => {
      activities.push({
        id: incident.id,
        type: 'findingIncident',
        title: `${incident.tipo} - ${incident.obra}`,
        date: safeDate(incident.fecha, incident.creadoEn),
        description: incident.descripcion || "Hallazgo o incidencia",
        status: incident.estado,
        workerId,
        metadata: { findingIncident: incident }
      });
    });

    // Ordenar actividades por fecha (más reciente primero)
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      worker,
      activities,
      documents,
      irls,
      talks,
      fitForWork,
      arts,
      findingIncidents: workerFindingIncidents,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Error al cargar timeline del trabajador');
  }
}

export async function getWorkersForPrevencionista(): Promise<Worker[]> {
  try {
    return await getWorkers();
  } catch (error) {
    throw new Error('Error al obtener trabajadores para prevencionista');
  }
}
