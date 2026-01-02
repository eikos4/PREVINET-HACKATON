import { db } from "../../offline/db";

export type UserRole =
  | "trabajador"
  | "prevencionista"
  | "supervisor"
  | "administrador"
  | "auditor"
  | "admin";

export type User = {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  workerId?: string;
  companyName?: string;
  companyRut?: string;
  creadoEn: Date;
};

const CURRENT_USER_KEY = "currentUserId";

export async function loginWithPin(
  pin: string,
  role: UserRole
): Promise<User> {
  if (role === "trabajador") {
    const existing = await db
      .table<User>("users")
      .where("pin")
      .equals(pin)
      .first();

    if (existing && existing.role === "trabajador") {
      const worker = existing.workerId
        ? await db.table("workers").get(existing.workerId)
        : await db.table("workers").where("pin").equals(pin).first();

      if (!worker) {
        throw new Error("PIN inválido o trabajador no enrolado");
      }

      if (!worker.habilitado) {
        throw new Error("Trabajador no habilitado para iniciar sesión");
      }

      const user: User = {
        ...existing,
        name: worker.nombre,
        workerId: worker.id,
      };

      setCurrentUser(user);
      return user;
    }

    const worker = await db.table("workers").where("pin").equals(pin).first();
    if (!worker) {
      throw new Error("PIN inválido o trabajador no enrolado");
    }

    if (!worker.habilitado) {
      throw new Error("Trabajador no habilitado para iniciar sesión");
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: worker.nombre,
      pin,
      role,
      workerId: worker.id,
      creadoEn: new Date(),
    };

    await db.table("users").add(user);
    setCurrentUser(user);
    return user;
  }

  const users = await db.table<User>("users").toArray();

  const existing = users.find(
    (u) => u.pin === pin && u.role === role
  );

  if (existing) {
    setCurrentUser(existing);
    return existing;
  }

  if (role === "supervisor" || role === "prevencionista" || role === "auditor") {
    throw new Error("Usuario no registrado. Debe ser creado/enrolado primero.");
  }

  const user: User = {
    id: crypto.randomUUID(),
    name: roleLabel(role),
    pin,
    role,
    creadoEn: new Date(),
  };

  await db.table("users").add(user);
  setCurrentUser(user);

  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;
  return (await db.table("users").get(id)) ?? null;
}

export function setCurrentUser(user: User) {
  localStorage.setItem(CURRENT_USER_KEY, user.id);
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function roleLabel(role: UserRole): string {
  switch (role) {
    case "trabajador":
      return "Trabajador";
    case "prevencionista":
      return "Prevencionista";
    case "supervisor":
      return "Supervisor";
    case "administrador":
      return "Administrador";
    case "auditor":
      return "Auditor";
    case "admin":
      return "Admin Empresa";
    default:
      return "Usuario";
  }
}
