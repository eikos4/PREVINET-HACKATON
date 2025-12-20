import { useState } from "react";
import { addReport } from "./report.service";

export default function ReportForm({ onCreated }: { onCreated: () => void }) {
  const [obra, setObra] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!obra || !categoria || !descripcion) {
      setError("Todos los campos son obligatorios");
      return;
    }

    await addReport({
      obra,
      categoria,
      descripcion,
    });

    setObra("");
    setCategoria("");
    setDescripcion("");
    onCreated();
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>⚠️ Reportar condición insegura</h3>
      <p className="form-hint">
        Reporte inmediato para prevenir incidentes
      </p>

      {/* DATOS PRINCIPALES */}
      <div className="form-grid">
        <input
          placeholder="Obra / Faena"
          value={obra}
          onChange={(e) => setObra(e.target.value)}
        />

        <input
          placeholder="Categoría (Ej: Caídas, Eléctrico, EPP)"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
      </div>

      {/* DESCRIPCIÓN */}
      <textarea
        className="form-textarea"
        placeholder="Describe claramente la condición insegura detectada"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />

      {error && <p className="form-error">{error}</p>}

      <button className="btn-primary" onClick={handleSubmit}>
        Enviar reporte
      </button>
    </div>
  );
}
