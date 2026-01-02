import type { Worker } from "./worker.service";

export default function WorkerProfile({ worker }: { worker: Worker }) {
  const exp = worker.expuestoA;
  const expParts = [
    exp?.alturaFisica ? "Altura física" : null,
    exp?.ruidos ? "Ruidos" : null,
    exp?.otros ? `Otros${exp?.otrosDetalle ? ` (${exp.otrosDetalle})` : ""}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">👷</span>
          <span>Mi Perfil</span>
        </h3>
      </div>

      <div className="p-6">
        <div className="grid gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Nombre</span>
            <span className="text-base text-gray-900 font-medium">{worker.nombre}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">RUT</span>
            <span className="text-base text-gray-900">{worker.rut}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Cargo</span>
            <span className="text-base text-gray-900">{worker.cargo}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Obra / Faena</span>
            <span className="text-base text-gray-900">{worker.obra}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Empresa</span>
            <span className="text-base text-gray-900">
              {worker.empresaNombre}
              {worker.empresaRut && (
                <span className="text-gray-500"> · {worker.empresaRut}</span>
              )}
            </span>
          </div>

          {worker.telefono && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500 mb-1">Contacto</span>
              <span className="text-base text-gray-900">{worker.telefono}</span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Expuesto a</span>
            <span className="text-base text-gray-900">{expParts.length ? expParts.join(", ") : "-"}</span>
          </div>

          {worker.enrolamientoFirmadoEn && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500 mb-1">Enrolamiento</span>
              <span className="text-base text-gray-900">
                Firmado: {new Date(worker.enrolamientoFirmadoEn).toLocaleString("es-CL")}
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 mb-1">Estado</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  worker.habilitado
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {worker.habilitado ? "✓ Habilitado" : "✗ No habilitado"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}