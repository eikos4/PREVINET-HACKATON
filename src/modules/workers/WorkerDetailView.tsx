import { useState, useEffect } from "react";
import { getWorkerCompleteData, getWorkerSignatureStatus, getDocumentSignaturesSummary } from "./workerDetail.service";
import type { WorkerDetailData } from "./workerDetail.service";

type WorkerDetailViewProps = {
  workerId: string;
  onBack?: () => void;
};

export default function WorkerDetailView({ workerId, onBack }: WorkerDetailViewProps) {
  const [data, setData] = useState<WorkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "activities" | "signatures">("info");

  useEffect(() => {
    const loadWorkerData = async () => {
      try {
        setLoading(true);
        setError(null);
        const workerData = await getWorkerCompleteData(workerId);
        setData({
          ...workerData,
          loading: false,
          error: null
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al cargar datos del trabajador";
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadWorkerData();
  }, [workerId]);

  if (loading) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "#64748b" }}>
          Cargando información del trabajador...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "#ef4444", fontWeight: 700 }}>
          {error || "No se pudo cargar la información del trabajador"}
        </p>
        {onBack && (
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{ marginTop: "1rem" }}
          >
            Volver
          </button>
        )}
      </div>
    );
  }

  const signatureStatus = getWorkerSignatureStatus(data.worker);
  const documentSummary = getDocumentSignaturesSummary(data.documents);

  const renderInfoTab = () => (
    <div className="worker-info">
      <div className="card">
        <h3>Datos Personales</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Nombre:</strong> {data.worker.nombre}
          </div>
          <div className="info-item">
            <strong>RUT:</strong> {data.worker.rut}
          </div>
          <div className="info-item">
            <strong>Cargo:</strong> {data.worker.cargo}
          </div>
          <div className="info-item">
            <strong>Obra:</strong> {data.worker.obra}
          </div>
          <div className="info-item">
            <strong>Empresa:</strong> {data.worker.empresaNombre}
          </div>
          <div className="info-item">
            <strong>RUT Empresa:</strong> {data.worker.empresaRut}
          </div>
          {data.worker.telefono && (
            <div className="info-item">
              <strong>Teléfono:</strong> {data.worker.telefono}
            </div>
          )}
          <div className="info-item">
            <strong>PIN:</strong> {data.worker.pin}
          </div>
          <div className="info-item">
            <strong>Estado:</strong> 
            <span className={`status-badge ${data.worker.habilitado ? 'active' : 'inactive'}`}>
              {data.worker.habilitado ? 'Habilitado' : 'No habilitado'}
            </span>
          </div>
          <div className="info-item">
            <strong>Creado:</strong> {new Date(data.worker.creadoEn).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Estado de Enrolamiento</h3>
        <div className="enrollment-status">
          <div className="status-item">
            <span className={`status-indicator ${signatureStatus.hasSignedEnrollment ? 'completed' : 'pending'}`}></span>
            <span>Enrolamiento Firmado: {signatureStatus.hasSignedEnrollment ? 'Sí' : 'No'}</span>
            {signatureStatus.signatureDate && (
              <small> ({new Date(signatureStatus.signatureDate).toLocaleDateString()})</small>
            )}
          </div>
          <div className="status-item">
            <span className={`status-indicator ${signatureStatus.hasIRL ? 'completed' : 'pending'}`}></span>
            <span>IRL Adjunto: {signatureStatus.hasIRL ? 'Sí' : 'No'}</span>
          </div>
          <div className="status-item">
            <span className={`status-indicator ${signatureStatus.hasAptitud ? 'completed' : 'pending'}`}></span>
            <span>Aptitud Adjunta: {signatureStatus.hasAptitud ? 'Sí' : 'No'}</span>
          </div>
        </div>
      </div>

      {data.worker.expuestoA && (
        <div className="card">
          <h3>Factores de Riesgo</h3>
          <div className="risk-factors">
            {data.worker.expuestoA.alturaFisica && <div className="risk-item">Altura Física</div>}
            {data.worker.expuestoA.ruidos && <div className="risk-item">Ruidos</div>}
            {data.worker.expuestoA.otros && (
              <div className="risk-item">Otros: {data.worker.expuestoA.otrosDetalle}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="worker-documents">
      <div className="card">
        <h3>Resumen de Documentos</h3>
        <div className="document-summary">
          <div className="summary-item">
            <strong>Total Documentos:</strong> {documentSummary.total}
          </div>
          <div className="summary-item">
            <strong>Firmados:</strong> {documentSummary.signed}
          </div>
          <div className="summary-item">
            <strong>Pendientes:</strong> {documentSummary.pending}
          </div>
        </div>
      </div>

      {data.documents.length > 0 && (
        <div className="card">
          <h3>Documentos Asignados</h3>
          <div className="document-list">
            {data.documents.map((doc) => {
              const assignment = doc.asignados.find(a => a.workerId === workerId);
              const isSigned = !!assignment?.firmadoEn;
              
              return (
                <div key={doc.id} className="document-item">
                  <div className="document-header">
                    <h4>{doc.titulo}</h4>
                    <span className={`status-badge ${isSigned ? 'completed' : 'pending'}`}>
                      {isSigned ? 'Firmado' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="document-details">
                    <p><strong>Categoría:</strong> {doc.categoria || 'Sin categoría'}</p>
                    <p><strong>Fecha:</strong> {doc.fecha}</p>
                    <p><strong>Descripción:</strong> {doc.descripcion || 'Sin descripción'}</p>
                    {isSigned && assignment && (
                      <div className="signature-info">
                        <p><strong>Firmado por:</strong> {assignment.firmadoPorNombre} ({assignment.firmadoPorRut})</p>
                        <p><strong>Fecha de firma:</strong> {assignment.firmadoEn ? new Date(assignment.firmadoEn).toLocaleDateString() : 'N/A'}</p>
                        {assignment.geo && (
                          <p><strong>Ubicación:</strong> Lat: {assignment.geo.lat.toFixed(6)}, Lng: {assignment.geo.lng.toFixed(6)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderActivitiesTab = () => (
    <div className="worker-activities">
      {data.irls.length > 0 && (
        <div className="card">
          <h3>IRLs ({data.irls.length})</h3>
          <div className="activity-list">
            {data.irls.map((irl) => (
              <div key={irl.id} className="activity-item">
                <h4>{irl.titulo}</h4>
                <p><strong>Fecha:</strong> {irl.fecha}</p>
                <p><strong>Estado:</strong> {irl.estado}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.talks.length > 0 && (
        <div className="card">
          <h3>Charlas ({data.talks.length})</h3>
          <div className="activity-list">
            {data.talks.map((talk) => (
              <div key={talk.id} className="activity-item">
                <h4>{talk.titulo}</h4>
                <p><strong>Fecha:</strong> {talk.fecha}</p>
                <p><strong>Tema:</strong> {talk.tema}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.fitForWork.length > 0 && (
        <div className="card">
          <h3>Evaluaciones Fit-for-Work ({data.fitForWork.length})</h3>
          <div className="activity-list">
            {data.fitForWork.map((ffw) => (
              <div key={ffw.id} className="activity-item">
                <h4>Evaluación - {ffw.fecha}</h4>
                <p><strong>Resultado:</strong> {ffw.resultado}</p>
                <p><strong>Evaluador:</strong> {ffw.evaluadorNombre}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.art.length > 0 && (
        <div className="card">
          <h3>ART/AST ({data.art.length})</h3>
          <div className="activity-list">
            {data.art.map((art) => (
              <div key={art.id} className="activity-item">
                <h4>{art.tipo} - {art.fecha}</h4>
                <p><strong>Obra:</strong> {art.obra}</p>
                <p><strong>Estado:</strong> {art.estado}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.findingIncidents.length > 0 && (
        <div className="card">
          <h3>Hallazgos/Incidencias ({data.findingIncidents.length})</h3>
          <div className="activity-list">
            {data.findingIncidents.map((incident) => (
              <div key={incident.id} className="activity-item">
                <h4>{incident.tipo} - {incident.fecha}</h4>
                <p><strong>Descripción:</strong> {incident.descripcion}</p>
                <p><strong>Estado:</strong> {incident.estado}</p>
                <p><strong>Obra:</strong> {incident.obra}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.irls.length === 0 && data.talks.length === 0 && data.fitForWork.length === 0 && 
       data.art.length === 0 && data.findingIncidents.length === 0 && (
        <div className="card">
          <p>No hay actividades registradas para este trabajador.</p>
        </div>
      )}
    </div>
  );

  const renderSignaturesTab = () => (
    <div className="worker-signatures">
      <div className="card">
        <h3>Historial de Firmas</h3>
        
        {signatureStatus.hasSignedEnrollment && (
          <div className="signature-record">
            <h4>Enrolamiento</h4>
            <div className="signature-details">
              <p><strong>Fecha:</strong> {signatureStatus.signatureDate ? new Date(signatureStatus.signatureDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Token:</strong> {signatureStatus.signatureToken}</p>
              {signatureStatus.signatureGeo && (
                <p><strong>Ubicación:</strong> Lat: {signatureStatus.signatureGeo.lat.toFixed(6)}, Lng: {signatureStatus.signatureGeo.lng.toFixed(6)}</p>
              )}
            </div>
          </div>
        )}

        {documentSummary.signedDocuments.map((doc, index) => (
          <div key={index} className="signature-record">
            <h4>{doc.documentTitle}</h4>
            <div className="signature-details">
              <p><strong>Firmado por:</strong> {doc.signedBy}</p>
              <p><strong>Fecha:</strong> {new Date(doc.signedDate).toLocaleDateString()}</p>
              {doc.geo && (
                <p><strong>Ubicación:</strong> Lat: {doc.geo.lat.toFixed(6)}, Lng: {doc.geo.lng.toFixed(6)}</p>
              )}
            </div>
          </div>
        ))}

        {!signatureStatus.hasSignedEnrollment && documentSummary.signedDocuments.length === 0 && (
          <p>No hay firmas registradas para este trabajador.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="worker-detail-view">
      {onBack && (
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: "1rem" }}>
          ← Volver a Trabajadores
        </button>
      )}

      <div className="worker-header">
        <h2>Ficha del Trabajador</h2>
        <h3>{data.worker.nombre} - {data.worker.cargo}</h3>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Información General
        </button>
        <button
          className={`tab-button ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          Documentos ({documentSummary.total})
        </button>
        <button
          className={`tab-button ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          Actividades
        </button>
        <button
          className={`tab-button ${activeTab === "signatures" ? "active" : ""}`}
          onClick={() => setActiveTab("signatures")}
        >
          Firmas ({signatureStatus.hasSignedEnrollment ? documentSummary.signedDocuments.length + 1 : documentSummary.signedDocuments.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "info" && renderInfoTab()}
        {activeTab === "documents" && renderDocumentsTab()}
        {activeTab === "activities" && renderActivitiesTab()}
        {activeTab === "signatures" && renderSignaturesTab()}
      </div>
    </div>
  );
}
