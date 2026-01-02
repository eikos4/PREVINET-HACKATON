import { useEffect, useState } from "react";


import { getReports } from "./report.service";
import type { Report } from "./report.service";


export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  if (reports.length === 0) {
    return <p>No hay reportes registrados.</p>;
  }

  return (
    <div className="card">
      <h3>Reportes de condiciones inseguras</h3>

      <ul>
        {reports.map((r) => (
          <li key={r.id}>
            <strong>{r.categoria}</strong> — {r.obra} —{" "}
            <span style={{ color: r.estado === "REPORTADO" ? "red" : "green" }}>
              {r.estado}
            </span>
            <br />
            <small>{r.descripcion}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
