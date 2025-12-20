import { db } from "../../offline/db";
import type { User, UserRole } from "../auth/auth.service";

export type CreatableManagedRole = "prevencionista" | "supervisor" | "auditor";

export type ManagedUserInput = {
  role: CreatableManagedRole;
  name: string;
  documentNumber: string;
  email?: string;
  phone?: string;
  position?: string;
  companyName?: string;
  companyRut?: string;
  pin: string;
  createdByUserId: string;
};

export async function createManagedUser(input: ManagedUserInput): Promise<User> {
  if (!/^\d{4}$/.test(input.pin)) {
    throw new Error("El PIN debe contener exactamente 4 dígitos");
  }

  const existingUserPin = await db.table("users").where("pin").equals(input.pin).first();
  if (existingUserPin) {
    throw new Error("Este PIN ya está en uso. Por favor, elija otro.");
  }

  const existingWorkerPin = await db.table("workers").where("pin").equals(input.pin).first();
  if (existingWorkerPin) {
    throw new Error("Este PIN ya está en uso. Por favor, elija otro.");
  }

  const users = (await db.table<User>("users").toArray()) as User[];
  const normalizedDoc = (input.documentNumber || "").trim().toLowerCase();
  if (normalizedDoc) {
    const existingDoc = users.find((u) => {
      const doc = (u as unknown as { documentNumber?: string }).documentNumber;
      return (doc || "").trim().toLowerCase() === normalizedDoc;
    });

    if (existingDoc) {
      throw new Error("Ya existe un usuario con este RUT/documento");
    }
  }

  const newUser = {
    id: crypto.randomUUID(),
    name: input.name,
    pin: input.pin,
    role: input.role as UserRole,
    creadoEn: new Date(),
    companyName: input.companyName,
    companyRut: input.companyRut,
    email: input.email,
    phone: input.phone,
    documentNumber: input.documentNumber,
    position: input.position,
    createdByUserId: input.createdByUserId,
  };

  await db.table("users").add(newUser);
  return newUser as User;
}

export async function listManagedUsers(params: {
  companyRut?: string;
}): Promise<(User & {
  email?: string;
  phone?: string;
  documentNumber?: string;
  position?: string;
  createdByUserId?: string;
})[]> {
  const users = (await db.table<User>("users").toArray()) as (User & {
    email?: string;
    phone?: string;
    documentNumber?: string;
    position?: string;
    createdByUserId?: string;
    companyRut?: string;
  })[];

  const allowed: UserRole[] = ["prevencionista", "supervisor", "auditor"];
  const filtered = users.filter((u) => allowed.includes(u.role));

  if (params.companyRut) {
    const rut = params.companyRut.trim();
    return filtered.filter((u) => (u.companyRut || "").trim() === rut);
  }

  return filtered;
}
