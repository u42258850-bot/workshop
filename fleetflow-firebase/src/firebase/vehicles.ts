// ============================================================
// src/firebase/vehicles.ts
// Vehicle Registry — Firestore CRUD
// Collection: "vehicles"
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";

export type VehicleType = "Truck" | "Van" | "Bike";
export type VehicleStatus =
  | "Available"
  | "In Shop"
  | "On Trip"
  | "Out of Service";

export interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  type: VehicleType;
  max_load: number;
  odometer: number;
  status: VehicleStatus;
  region: string;
  createdAt?: any;
}

const COL = "vehicles";

// ── ADD VEHICLE ───────────────────────────────────────────────
export async function addVehicle(
  data: Omit<Vehicle, "id" | "createdAt">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      status: "Available",
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL VEHICLES ──────────────────────────────────────────
export async function getVehicles(): Promise<Vehicle[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
}

// ── GET SINGLE VEHICLE ────────────────────────────────────────
export async function getVehicle(id: string): Promise<Vehicle | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Vehicle;
}

// ── UPDATE VEHICLE ────────────────────────────────────────────
export async function updateVehicle(
  id: string,
  updates: Partial<Vehicle>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, COL, id), updates);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── UPDATE VEHICLE STATUS ─────────────────────────────────────
export async function setVehicleStatus(
  id: string,
  status: VehicleStatus
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

// ── DELETE VEHICLE ────────────────────────────────────────────
export async function deleteVehicle(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, COL, id));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
export function listenVehicles(
  callback: (vehicles: Vehicle[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
  });
}
