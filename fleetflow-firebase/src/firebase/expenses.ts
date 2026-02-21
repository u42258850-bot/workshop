// ============================================================
// src/firebase/expenses.ts
// Trip Expenses — Firestore CRUD
// Collection: "expenses"
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";

export interface ExpenseRecord {
  id: string;
  trip_id: string;
  driver_name: string;
  fuel_cost: number;
  misc_expense: number;
  date: string;
  createdAt?: any;
}

const COL = "expenses";

// ── LOG EXPENSE ───────────────────────────────────────────────
export async function logExpense(
  data: Omit<ExpenseRecord, "id" | "createdAt">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      date: data.date || new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL EXPENSES ──────────────────────────────────────────
export async function getExpenses(): Promise<ExpenseRecord[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseRecord));
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
export function listenExpenses(
  callback: (expenses: ExpenseRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseRecord)));
  });
}

// ── TOTAL FUEL SPEND ──────────────────────────────────────────
export async function getTotalFuelSpend(): Promise<number> {
  const expenses = await getExpenses();
  return expenses.reduce((sum, e) => sum + (e.fuel_cost || 0), 0);
}
