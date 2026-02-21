// ============================================================
// src/firebase/auth.ts
// All authentication functions for FleetFlow
// Handles: Sign In, Register, Logout, Forgot Password
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./config";

export type UserRole =
  | "Fleet Manager"
  | "Dispatcher"
  | "Safety Officer"
  | "Financial Analyst";

export interface FleetUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

// ── SIGN IN ───────────────────────────────────────────────────
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; user?: FleetUser; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = await getUserProfile(cred.user.uid);
    if (!user) return { success: false, error: "User profile not found." };
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: friendlyError(err.code) };
  }
}

// ── REGISTER ──────────────────────────────────────────────────
export async function register(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: boolean; user?: FleetUser; error?: string }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const avatar = name.substring(0, 2).toUpperCase();
    const profile: FleetUser = {
      uid: cred.user.uid,
      name,
      email,
      role,
      avatar,
    };

    await setDoc(doc(db, "users", cred.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });

    return { success: true, user: profile };
  } catch (err: any) {
    return { success: false, error: friendlyError(err.code) };
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(auth);
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
export async function forgotPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: friendlyError(err.code) };
  }
}

// ── GET USER PROFILE FROM FIRESTORE ───────────────────────────
export async function getUserProfile(
  uid: string
): Promise<FleetUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as FleetUser;
}

// ── AUTH STATE LISTENER ───────────────────────────────────────
export function listenAuth(
  callback: (user: FleetUser | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      callback(profile);
    } else {
      callback(null);
    }
  });
}

// ── FRIENDLY ERROR MESSAGES ───────────────────────────────────
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return map[code] || "An unexpected error occurred.";
}
