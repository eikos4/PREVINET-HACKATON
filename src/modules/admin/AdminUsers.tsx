import { useEffect, useMemo, useState } from "react";
import type { User } from "../auth/auth.service";
import type { CreatableManagedRole } from "./adminUsers.service";
import { createManagedUser, listManagedUsers } from "./adminUsers.service";

type Props = {
  currentUser: User;
};

type FormState = {
  role: CreatableManagedRole;
  name: string;
  documentNumber: string;
  email: string;
  phone: string;
  position: string;
  companyName: string;
  companyRut: string;
  pin: string;
  confirmPin: string;
};

export default function AdminUsers({ currentUser }: Props) {
  const inputClassName =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";
  const selectClassName =
    "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

  const [form, setForm] = useState<FormState>({
    role: "supervisor",
    name: "",
    documentNumber: "",
    email: "",
    phone: "",
    position: "",
    companyName: currentUser.companyName ?? "",
    companyRut: currentUser.companyRut ?? "",
    pin: "",
    confirmPin: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [users, setUsers] = useState<
    (User & {
      email?: string;
      phone?: string;
      documentNumber?: string;
      position?: string;
      companyName?: string;
      companyRut?: string;
      createdByUserId?: string;
    })[]
  >([]);

  const companyRutFilter = useMemo(() => {
    const rut = currentUser.companyRut?.trim();
    return rut ? rut : undefined;
  }, [currentUser.companyRut]);

  useEffect(() => {
    listManagedUsers({ companyRut: companyRutFilter }).then(setUsers);
  }, [reload, companyRutFilter]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Nombre es obligatorio");
      return;
    }

    if (!form.documentNumber.trim()) {
      setError("RUT / Documento es obligatorio");
      return;
    }

    if (!/^\d{4}$/.test(form.pin)) {
      setError("El PIN debe contener exactamente 4 dígitos");
      return;
    }

    if (form.pin !== form.confirmPin) {
      setError("Los PINs no coinciden");
      return;
    }

    if (!form.companyName.trim() || !form.companyRut.trim()) {
      setError("Empresa y RUT Empresa son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await createManagedUser({
        role: form.role,
        name: form.name.trim(),
        documentNumber: form.documentNumber.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        position: form.position.trim() || undefined,
        companyName: form.companyName.trim(),
        companyRut: form.companyRut.trim(),
        pin: form.pin,
        createdByUserId: currentUser.id,
      });

      setSuccess("Usuario creado correctamente");
      setForm((prev) => ({
        ...prev,
        name: "",
        documentNumber: "",
        email: "",
        phone: "",
        position: "",
        pin: "",
        confirmPin: "",
      }));
      setReload((r) => r + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear usuario";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="m-0 flex items-center gap-2 text-xl font-semibold text-white">
              <span className="text-2xl">👥</span>
              <span>Usuarios</span>
            </h3>
            <div className="text-xs text-white/80">
              {companyRutFilter ? `Empresa: ${companyRutFilter}` : ""}
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Rol *</label>
                <select
                  className={selectClassName}
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                >
                  <option value="prevencionista">Prevencionista</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Nombre *</label>
                <input
                  className={inputClassName}
                  type="text"
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">RUT / Documento *</label>
                <input
                  className={inputClassName}
                  type="text"
                  placeholder="RUT"
                  value={form.documentNumber}
                  onChange={(e) => handleChange("documentNumber", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Cargo</label>
                <input
                  className={inputClassName}
                  type="text"
                  placeholder="Cargo"
                  value={form.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Empresa *</label>
                <input
                  className={inputClassName}
                  type="text"
                  placeholder="Empresa"
                  value={form.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">RUT Empresa *</label>
                <input
                  className={inputClassName}
                  type="text"
                  placeholder="RUT Empresa"
                  value={form.companyRut}
                  onChange={(e) => handleChange("companyRut", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  className={inputClassName}
                  type="email"
                  placeholder="correo@empresa.cl"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  className={inputClassName}
                  type="tel"
                  placeholder="+56 9 ..."
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">PIN (4 dígitos) *</label>
                <input
                  className={inputClassName}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={form.pin}
                  onChange={(e) => handleChange("pin", e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Confirmar PIN *</label>
                <input
                  className={inputClassName}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={form.confirmPin}
                  onChange={(e) => handleChange("confirmPin", e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="m-0 flex items-center gap-2 text-xl font-semibold text-white">
            <span className="text-2xl">📇</span>
            <span>Usuarios creados</span>
          </h3>
        </div>

        <div className="p-6">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500" style={{ margin: 0 }}>
              No hay usuarios creados aún.
            </p>
          ) : (
            <div className="space-y-3">
              {users
                .sort((a, b) => {
                  try {
                    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
                  } catch {
                    return 0;
                  }
                })
                .map((u) => {
                  const doc = (u as unknown as { documentNumber?: string }).documentNumber ?? "";
                  const pos = (u as unknown as { position?: string }).position ?? "";
                  const compName = (u as unknown as { companyName?: string }).companyName ?? "";
                  const compRut = (u as unknown as { companyRut?: string }).companyRut ?? "";

                  return (
                    <div
                      key={u.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-[64px] text-center text-xs font-bold text-blue-700">
                          {String(u.role).toUpperCase()}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                          <div className="mt-1 text-xs text-slate-600">
                            {doc}
                            {pos ? ` · ${pos}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {compName}
                            {compRut ? ` · ${compRut}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        PIN: {u.pin}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
