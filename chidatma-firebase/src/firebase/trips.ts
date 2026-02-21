// ============================================================
// src/firebase/trips.ts
// Trip Dispatcher — create, complete, list, real-time
// Collection: "trips"
//
// Validation rules (same as original server):
//   1. cargo_weight ≤ vehicle.max_load
//   2. driver license not expired
//   3. vehicle must be Available
//   4. driver must be On Duty
//   5. end_odometer ≥ start_odometer on complete
// ============================================================

import {
  collection, addDoc, getDocs, doc, updateDoc, getDoc,
  query, orderBy, onSnapshot, serverTimestamp, Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { getVehicle, setVehicleStatus, updateOdometer } from "./vehicles";
import { getDriver, setDriverStatus } from "./drivers";

export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  vehicle_name: string;
  driver_name: string;
  cargo_weight: number;
  status: TripStatus;
  start_date: string;
  end_date?: string;
  start_odometer: number;
  end_odometer?: number;
  createdAt?: any;
}

const COL = "trips";

// ── CREATE TRIP (with validation) ─────────────────────────────
export async function createTrip(data: {
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const [vehicle, driver] = await Promise.all([
      getVehicle(data.vehicle_id),
      getDriver(data.driver_id),
    ]);

    if (!vehicle) return { success: false, error: "Vehicle not found." };
    if (!driver)  return { success: false, error: "Driver not found." };

    // ✅ Rule 1: cargo within capacity
    if (data.cargo_weight > vehicle.max_load)
      return { success: false, error: `Cargo (${data.cargo_weight} kg) exceeds vehicle capacity (${vehicle.max_load} kg).` };

    // ✅ Rule 2: vehicle must be Available
    if (vehicle.status !== "Available")
      return { success: false, error: `Vehicle "${vehicle.name}" is not available (status: ${vehicle.status}).` };

    // ✅ Rule 3: driver must be On Duty
    if (driver.status !== "On Duty")
      return { success: false, error: `Driver "${driver.name}" is not available (status: ${driver.status}).` };

    // ✅ Rule 4: license not expired
    if (new Date(driver.license_expiry) < new Date())
      return { success: false, error: `Driver "${driver.name}" license expired on ${driver.license_expiry}.` };

    const ref = await addDoc(collection(db, COL), {
      ...data,
      vehicle_name: vehicle.name,
      driver_name: driver.name,
      status: "Dispatched",
      start_date: new Date().toISOString(),
      start_odometer: vehicle.odometer,
      createdAt: serverTimestamp(),
    });

    // Update statuses
    await Promise.all([
      setVehicleStatus(data.vehicle_id, "On Trip"),
      setDriverStatus(data.driver_id, "On Trip"),
    ]);

    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── COMPLETE TRIP ─────────────────────────────────────────────
export async function completeTrip(
  tripId: string,
  end_odometer: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const snap = await getDoc(doc(db, COL, tripId));
    if (!snap.exists()) return { success: false, error: "Trip not found." };

    const trip = { id: snap.id, ...snap.data() } as Trip;

    // ✅ Rule 5: end odometer must be ≥ start
    if (end_odometer < trip.start_odometer)
      return { success: false, error: `Final odometer (${end_odometer}) cannot be less than start odometer (${trip.start_odometer}).` };

    await Promise.all([
      updateDoc(doc(db, COL, tripId), {
        status: "Completed",
        end_date: new Date().toISOString(),
        end_odometer,
      }),
      setVehicleStatus(trip.vehicle_id, "Available"),
      updateOdometer(trip.vehicle_id, end_odometer),
      setDriverStatus(trip.driver_id, "On Duty"),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL TRIPS ─────────────────────────────────────────────
export async function getTrips(): Promise<Trip[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
}

// ── REAL-TIME ─────────────────────────────────────────────────
export function listenTrips(cb: (t: Trip[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip)))
  );
}
