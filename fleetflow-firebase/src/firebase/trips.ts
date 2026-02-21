// ============================================================
// src/firebase/trips.ts
// Trip Dispatcher — Firestore + business logic validation
// Collection: "trips"
// Validation:
//   - cargo_weight must NOT exceed vehicle max_load
//   - Driver license must NOT be expired
//   - Vehicle must be "Available"
//   - Driver must be "Off Duty"
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";
import { getVehicle, setVehicleStatus } from "./vehicles";
import { getDriver, setDriverStatus } from "./drivers";

export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  vehicle_name?: string;
  driver_name?: string;
  cargo_weight: number;
  status: TripStatus;
  origin: string;
  destination: string;
  estimated_fuel_cost: number;
  createdAt?: any;
}

export interface CreateTripData {
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  origin: string;
  destination: string;
  estimated_fuel_cost: number;
}

const COL = "trips";

// ── CREATE TRIP (with validation) ─────────────────────────────
export async function createTrip(
  data: CreateTripData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Fetch vehicle and driver in parallel
    const [vehicle, driver] = await Promise.all([
      getVehicle(data.vehicle_id),
      getDriver(data.driver_id),
    ]);

    if (!vehicle) return { success: false, error: "Vehicle not found." };
    if (!driver) return { success: false, error: "Driver not found." };

    // ✅ Rule 1: Cargo weight must not exceed vehicle capacity
    if (data.cargo_weight > vehicle.max_load) {
      return {
        success: false,
        error: `Cargo weight (${data.cargo_weight.toLocaleString()} kg) exceeds vehicle capacity (${vehicle.max_load.toLocaleString()} kg).`,
      };
    }

    // ✅ Rule 2: Vehicle must be Available
    if (vehicle.status !== "Available") {
      return {
        success: false,
        error: `Vehicle "${vehicle.name}" is not available (current status: ${vehicle.status}).`,
      };
    }

    // ✅ Rule 3: Driver must be Off Duty
    if (driver.status !== "Off Duty") {
      return {
        success: false,
        error: `Driver "${driver.name}" is not available (current status: ${driver.status}).`,
      };
    }

    // ✅ Rule 4: Driver license must not be expired
    const today = new Date();
    const expiry = new Date(driver.license_expiry);
    if (expiry < today) {
      return {
        success: false,
        error: `Driver "${driver.name}"'s license expired on ${driver.license_expiry}. Cannot dispatch.`,
      };
    }

    // Create trip document
    const tripDoc = {
      ...data,
      vehicle_name: vehicle.name,
      driver_name: driver.name,
      status: "Dispatched" as TripStatus,
      createdAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(db, COL), tripDoc);

    // Update vehicle and driver status atomically
    await Promise.all([
      setVehicleStatus(data.vehicle_id, "On Trip"),
      setDriverStatus(data.driver_id, "On Duty"),
    ]);

    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL TRIPS ─────────────────────────────────────────────
export async function getTrips(): Promise<Trip[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
}

// ── COMPLETE TRIP ─────────────────────────────────────────────
// Frees up vehicle and driver
export async function completeTrip(
  tripId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tripSnap = await getDoc(doc(db, COL, tripId));
    if (!tripSnap.exists()) return { success: false, error: "Trip not found." };

    const trip = { id: tripSnap.id, ...tripSnap.data() } as Trip;

    await Promise.all([
      updateDoc(doc(db, COL, tripId), { status: "Completed" }),
      setVehicleStatus(trip.vehicle_id, "Available"),
      setDriverStatus(trip.driver_id, "Off Duty"),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── CANCEL TRIP ───────────────────────────────────────────────
export async function cancelTrip(
  tripId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tripSnap = await getDoc(doc(db, COL, tripId));
    if (!tripSnap.exists()) return { success: false, error: "Trip not found." };

    const trip = { id: tripSnap.id, ...tripSnap.data() } as Trip;

    await Promise.all([
      updateDoc(doc(db, COL, tripId), { status: "Cancelled" }),
      setVehicleStatus(trip.vehicle_id, "Available"),
      setDriverStatus(trip.driver_id, "Off Duty"),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
export function listenTrips(
  callback: (trips: Trip[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip)));
  });
}
