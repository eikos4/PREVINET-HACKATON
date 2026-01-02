import { useMemo, useState } from "react";
import {
  addFindingIncident,
  type EvidenceAttachment,
  type FindingIncidentType,
} from "./findingIncident.service";

export default function FindingIncidentForm({
  creadoPorUserId,
  defaultObra,
  onCreated,
}: {
  creadoPorUserId?: string;
  defaultObra?: string;
  onCreated: () => void;
}) {
  const [tipo, setTipo] = useState<FindingIncidentType>("HALLAZGO");

  const [obra, setObra] = useState(defaultObra ?? "");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const [descripcion, setDescripcion] = useState("");

  const [riesgoPotencial, setRiesgoPotencial] = useState("");
  const [responsable, setResponsable] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [plazoResolver, setPlazoResolver] = useState("");

  const [personasInvolucradas, setPersonasInvolucradas] = useState("");
  const [consecuencias, setConsecuencias] = useState("");
  const [causasProbables, setCausasProbables] = useState("");
  const [medidasInmediatas, setMedidasInmediatas] = useState("");

  const [files, setFiles] = useState<File[]>([]);

  const [error, setError] = useState("");

  const tipoLabel = useMemo(() => {
    return tipo === "HALLAZGO" ? "Hallazgo" : "Incidencia";
  }, [tipo]);

  const handleSubmit = async () => {
    setError("");

    if (!obra.trim() || !lugar.trim() || !fecha || !descripcion.trim()) {
      setError("Completa obra, lugar, fecha y descripción");
      return;
    }

    if (tipo === "HALLAZGO") {
      if (!riesgoPotencial.trim() || !responsable.trim() || !recomendacion.trim()) {
        setError("Completa riesgo potencial, responsable y recomendación");
        return;
      }
    }

    if (tipo === "INCIDENCIA") {
      if (!hora.trim()) {
        setError("Completa la hora del evento");
        return;
      }
      if (!consecuencias.trim() || !causasProbables.trim() || !medidasInmediatas.trim()) {
        setError("Completa consecuencias, causas probables y medidas inmediatas");
        return;
      }
    }

    const evidencias: EvidenceAttachment[] = files.map((f) => ({
      id: crypto.randomUUID(),
      fileName: f.name,
      mimeType: f.type || "application/octet-stream",
      blob: f,
      creadoEn: new Date(),
    }));

    await addFindingIncident({
      tipo,
      obra: obra.trim(),
      lugar: lugar.trim(),
      fecha,
      hora: hora.trim() || undefined,
      descripcion: descripcion.trim(),

      riesgoPotencial: tipo === "HALLAZGO" ? riesgoPotencial.trim() : undefined,
      responsable: tipo === "HALLAZGO" ? responsable.trim() : undefined,
      recomendacion: tipo === "HALLAZGO" ? recomendacion.trim() : undefined,
      plazoResolver: tipo === "HALLAZGO" ? (plazoResolver.trim() || undefined) : undefined,

      personasInvolucradas:
        tipo === "INCIDENCIA" ? (personasInvolucradas.trim() || undefined) : undefined,
      consecuencias: tipo === "INCIDENCIA" ? consecuencias.trim() : undefined,
      causasProbables: tipo === "INCIDENCIA" ? causasProbables.trim() : undefined,
      medidasInmediatas: tipo === "INCIDENCIA" ? medidasInmediatas.trim() : undefined,

      evidencias: evidencias.length > 0 ? evidencias : undefined,
      seguimiento: [],

      creadoPorUserId,
    });

    setLugar("");
    setFecha("");
    setHora("");
    setDescripcion("");

    setRiesgoPotencial("");
    setResponsable("");
    setRecomendacion("");
    setPlazoResolver("");

    setPersonasInvolucradas("");
    setConsecuencias("");
    setCausasProbables("");
    setMedidasInmediatas("");

    setFiles([]);

    onCreated();
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>🧱 Registro de {tipoLabel}</h3>
      <p className="form-hint">
        {tipo === "HALLAZGO"
          ? "Detectado en inspección: riesgo potencial antes de que ocurra un evento."
          : "Evento ocurrido: incidencia real que requiere análisis, medidas y cierre."}
      </p>

      <div className="form-grid">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as FindingIncidentType)}
        >
          <option value="HALLAZGO">Hallazgo</option>
          <option value="INCIDENCIA">Incidencia</option>
        </select>

        <input
          placeholder="Obra / Faena"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
        />

        <input
          placeholder="Lugar exacto"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
        />

        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        {tipo === "INCIDENCIA" && (
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        )}
      </div>

      <textarea
        className="form-textarea"
        placeholder={
          tipo === "HALLAZGO"
            ? "Descripción del hallazgo"
            : "Descripción del hecho ocurrido"
        }
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />

      {tipo === "HALLAZGO" ? (
        <>
          <textarea
            className="form-textarea"
            placeholder="Riesgo potencial asociado"
            value={riesgoPotencial}
            onChange={(e) => setRiesgoPotencial(e.target.value)}
          />

          <div className="form-grid">
            <input
              placeholder="Responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />

            <input
              placeholder="Plazo para resolver (opcional)"
              value={plazoResolver}
              onChange={(e) => setPlazoResolver(e.target.value)}
            />
          </div>

          <textarea
            className="form-textarea"
            placeholder="Recomendación / acción correctiva"
            value={recomendacion}
            onChange={(e) => setRecomendacion(e.target.value)}
          />
        </>
      ) : (
        <>
          <textarea
            className="form-textarea"
            placeholder="Personas involucradas (opcional)"
            value={personasInvolucradas}
            onChange={(e) => setPersonasInvolucradas(e.target.value)}
          />

          <textarea
            className="form-textarea"
            placeholder="Consecuencias del evento (lesiones, daños materiales…)"
            value={consecuencias}
            onChange={(e) => setConsecuencias(e.target.value)}
          />

          <textarea
            className="form-textarea"
            placeholder="Causas probables"
            value={causasProbables}
            onChange={(e) => setCausasProbables(e.target.value)}
          />

          <textarea
            className="form-textarea"
            placeholder="Medidas adoptadas inmediatamente"
            value={medidasInmediatas}
            onChange={(e) => setMedidasInmediatas(e.target.value)}
          />
        </>
      )}

      <div className="card" style={{ background: "#f8fafc" }}>
        <strong>📎 Evidencia (foto o documento)</strong>
        <div className="form-hint" style={{ marginTop: "0.25rem" }}>
          Se guarda localmente en este dispositivo.
        </div>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        {files.length > 0 && (
          <div className="form-hint">{files.length} archivo(s) seleccionado(s)</div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="btn-primary" onClick={handleSubmit}>
        Guardar {tipoLabel}
      </button>
    </div>
  );
}
