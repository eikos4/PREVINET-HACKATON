import { useMemo, useState } from "react";
import SignatureModal from "../irl/SignatureModal";
import { addWorker, revertWorkerEnrollment, signWorkerEnrollment } from "./worker.service";

export default function WorkerForm({ onCreated }: { onCreated: () => void }) {
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [cargo, setCargo] = useState("");
  const [obra, setObra] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresaRut, setEmpresaRut] = useState("");
  const [telefono, setTelefono] = useState("");
  const [expAltura, setExpAltura] = useState(false);
  const [expRuidos, setExpRuidos] = useState(false);
  const [expOtros, setExpOtros] = useState(false);
  const [expOtrosDetalle, setExpOtrosDetalle] = useState("");
  const [irlAdjunto, setIrlAdjunto] = useState<File | null>(null);
  const [aptitudAdjunto, setAptitudAdjunto] = useState<File | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [signingWorkerId, setSigningWorkerId] = useState<string | null>(null);
  const [signingBusy, setSigningBusy] = useState(false);

  const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wider";
  const inputClass =
    "mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500";
  const fileInputClass =
    "mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200";
  const sectionTitleClass = "text-sm font-semibold text-gray-900";
  const sectionHintClass = "mt-1 text-sm text-gray-500";

  const cargoOptions = useMemo(
    () => [
      "capataz",
      "maestro",
      "ayudante",
      "jornal",
      "operario de máquina",
    ],
    []
  );

  const handleSubmit = async () => {
    setError("");

    if (!nombre || !rut || !cargo || !obra || !empresaNombre || !empresaRut || !telefono) {
      setError("Todos los campos son obligatorios (incluye teléfono)");
      return;
    }

    if (!irlAdjunto) {
      setError("Debes adjuntar el IRL (PDF, Word o Excel)");
      return;
    }

    if (!aptitudAdjunto) {
      setError("Debes adjuntar el documento de aptitud");
      return;
    }

    if (pin !== confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe contener exactamente 4 dígitos");
      return;
    }

    const isIrlAllowed =
      irlAdjunto.type === "application/pdf" ||
      irlAdjunto.type === "application/msword" ||
      irlAdjunto.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      irlAdjunto.type === "application/vnd.ms-excel" ||
      irlAdjunto.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isIrlAllowed) {
      setError("Formato IRL no soportado. Solo PDF/Word/Excel");
      return;
    }

    try {
      const created = await addWorker({
        nombre,
        rut,
        cargo,
        obra,
        empresaNombre,
        empresaRut,
        telefono,
        expuestoA: {
          alturaFisica: expAltura,
          ruidos: expRuidos,
          otros: expOtros,
          otrosDetalle: expOtros ? expOtrosDetalle : undefined,
        },
        irlAdjunto: {
          fileName: irlAdjunto.name,
          mimeType: irlAdjunto.type || "application/octet-stream",
          blob: irlAdjunto,
        },
        aptitudAdjunto: {
          fileName: aptitudAdjunto.name,
          mimeType: aptitudAdjunto.type || "application/octet-stream",
          blob: aptitudAdjunto,
        },
        pin,
        habilitado: false,
      });

      setSigningWorkerId(created.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo enrolar el trabajador";
      setError(message);
      return;
    }
  };

  const handleConfirmSignature = async (signatureDataUrl: string) => {
    if (!signingWorkerId) return;
    setError("");
    setSigningBusy(true);
    try {
      const geo = await getGeoSafe();
      await signWorkerEnrollment(signingWorkerId, signatureDataUrl, geo ?? undefined);

      setNombre("");
      setRut("");
      setCargo("");
      setObra("");
      setEmpresaNombre("");
      setEmpresaRut("");
      setTelefono("");
      setExpAltura(false);
      setExpRuidos(false);
      setExpOtros(false);
      setExpOtrosDetalle("");
      setIrlAdjunto(null);
      setAptitudAdjunto(null);
      setPin("");
      setConfirmPin("");
      setSigningWorkerId(null);
      onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo firmar el enrolamiento";
      setError(message);
    } finally {
      setSigningBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 m-0">
          <span className="text-2xl">👷</span>
          <span>Enrolar trabajador</span>
        </h3>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <p className="text-sm text-gray-600" style={{ marginTop: 0 }}>
            Registro rápido para operación en terreno
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <section>
            <div>
              <h4 className={sectionTitleClass}>Datos del trabajador</h4>
              <p className={sectionHintClass}>Completa la identificación básica y datos de contacto.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="worker-nombre" className={labelClass}>
                  Nombre completo
                </label>
                <input
                  id="worker-nombre"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="worker-rut" className={labelClass}>
                  RUT
                </label>
                <input
                  id="worker-rut"
                  placeholder="RUT"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="worker-telefono" className={labelClass}>
                  Teléfono de contacto
                </label>
                <input
                  id="worker-telefono"
                  placeholder="Teléfono de contacto"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section>
            <div>
              <h4 className={sectionTitleClass}>Información laboral</h4>
              <p className={sectionHintClass}>Empresa, cargo y obra/fábrica donde se desempeña.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="worker-cargo" className={labelClass}>
                  Cargo
                </label>
                <select
                  id="worker-cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecciona cargo…</option>
                  {cargoOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="worker-obra" className={labelClass}>
                  Obra / Faena
                </label>
                <input
                  id="worker-obra"
                  placeholder="Obra / Faena"
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="worker-empresa" className={labelClass}>
                  Empresa (Razón social)
                </label>
                <input
                  id="worker-empresa"
                  placeholder="Empresa (Razón social)"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="worker-empresa-rut" className={labelClass}>
                  RUT Empresa
                </label>
                <input
                  id="worker-empresa-rut"
                  placeholder="RUT Empresa"
                  value={empresaRut}
                  onChange={(e) => setEmpresaRut(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <div>
              <h4 className={sectionTitleClass}>Seguridad</h4>
              <p className={sectionHintClass}>Define un PIN de 4 dígitos para acceso del trabajador.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="worker-pin" className={labelClass}>
                  PIN (4 dígitos)
                </label>
                <input
                  id="worker-pin"
                  placeholder="PIN (4 dígitos)"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="worker-confirm-pin" className={labelClass}>
                  Confirmar PIN
                </label>
                <input
                  id="worker-confirm-pin"
                  placeholder="Confirmar PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </section>

          <section>
            <div>
              <h4 className={sectionTitleClass}>Exposición</h4>
              <p className={sectionHintClass}>Marca los riesgos a los que está expuesto el trabajador.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
                <input
                  type="checkbox"
                  checked={expAltura}
                  onChange={(e) => setExpAltura(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Altura física</div>
                  <div className="text-xs text-gray-500">Trabajo en altura o plataformas.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
                <input
                  type="checkbox"
                  checked={expRuidos}
                  onChange={(e) => setExpRuidos(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Ruidos</div>
                  <div className="text-xs text-gray-500">Ambientes con ruido elevado.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
                <input
                  type="checkbox"
                  checked={expOtros}
                  onChange={(e) => setExpOtros(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Otros</div>
                  <div className="text-xs text-gray-500">Especifica el detalle si aplica.</div>
                </div>
              </label>
            </div>

            {expOtros && (
              <div className="mt-4">
                <label htmlFor="worker-exp-otros" className={labelClass}>
                  Detalle otros
                </label>
                <input
                  id="worker-exp-otros"
                  placeholder="Detalle otros"
                  value={expOtrosDetalle}
                  onChange={(e) => setExpOtrosDetalle(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </section>

          <section>
            <div>
              <h4 className={sectionTitleClass}>Documentos</h4>
              <p className={sectionHintClass}>Adjunta IRL y documento de aptitud para continuar a firma.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>IRL (PDF/Word/Excel)</label>
                <input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setIrlAdjunto(e.target.files?.[0] ?? null)}
                  className={fileInputClass}
                />
                {irlAdjunto && (
                  <p className="mt-2 text-xs text-gray-600">
                    Archivo: <span className="font-semibold text-gray-900">{irlAdjunto.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Documento de aptitud</label>
                <input
                  type="file"
                  onChange={(e) => setAptitudAdjunto(e.target.files?.[0] ?? null)}
                  className={fileInputClass}
                />
                {aptitudAdjunto && (
                  <p className="mt-2 text-xs text-gray-600">
                    Archivo: <span className="font-semibold text-gray-900">{aptitudAdjunto.name}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              onClick={handleSubmit}
              disabled={!!signingWorkerId || signingBusy}
            >
              {signingWorkerId ? "Esperando firma..." : "Continuar a firma"}
            </button>
          </div>
        </div>
      </div>

      <SignatureModal
        open={!!signingWorkerId}
        title="Firma de enrolamiento"
        subtitle="Firma del trabajador para enrolamiento e IRL"
        onCancel={() => {
          if (signingBusy) return;
          const id = signingWorkerId;
          setSigningWorkerId(null);
          if (id) {
            revertWorkerEnrollment(id).catch(() => {
              // noop
            });
          }
        }}
        onConfirm={handleConfirmSignature}
      />
    </div>
  );
}

async function getGeoSafe(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  if (!("geolocation" in navigator)) return null;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
      });
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch {
    return null;
  }
}
