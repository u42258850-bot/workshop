# 🚛 FleetFlow India — Firebase Backend

This is the **complete Firebase-powered backend** for the FleetFlow India fleet management system.
It replaces the original SQLite + Express server with **Firestore real-time database** + **Firebase Auth**.

---

## 🗂️ New File Structure

```
fleetflow-firebase/
├── src/
│   ├── App.tsx                       ← ✅ FULLY REWRITTEN — all buttons wired to Firebase
│   ├── components/UI.tsx             ← Keep from original (unchanged)
│   ├── index.css                     ← Keep from original (unchanged)
│   ├── main.tsx                      ← Keep from original (unchanged)
│   └── firebase/
│       ├── config.ts                 ← 🔧 PUT YOUR FIREBASE CREDENTIALS HERE
│       ├── auth.ts                   ← Sign In, Register, Logout, Forgot Password
│       ├── vehicles.ts               ← Add, Edit, List, Real-time updates
│       ├── drivers.ts                ← Add, List, Status updates
│       ├── trips.ts                  ← Create trip with 4 validation rules
│       ├── maintenance.ts            ← Schedule service, update status
│       ├── expenses.ts               ← Log & list fuel/misc expenses
│       ├── analytics.ts              ← Dashboard stats, financial summary
│       └── seed.ts                   ← One-click demo data population
├── firestore.rules                   ← Role-based security rules
├── firestore.indexes.json            ← Compound query indexes
├── firebase.json                     ← Firebase project config
└── package.json                      ← All dependencies
```

---

## ⚡ Setup in 4 Steps

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add Project** → name it (e.g. `fleetflow-india`)
3. Enable these services:
   - **Authentication** → Sign-in methods → **Email/Password** ✅
   - **Firestore Database** → Create in **production mode**
   - *(Storage not required for this app)*

### Step 2 — Add Your Credentials
Open `src/firebase/config.ts` and replace **all** `YOUR_*` values:

```ts
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fleetflow-india.firebaseapp.com",
  projectId: "fleetflow-india",
  storageBucket: "fleetflow-india.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc...",
};
```

> Get these from: Firebase Console → ⚙️ Project Settings → Your Apps → Web App → Config

### Step 3 — Copy Files from Original Project
Copy these unchanged files from your original `fleetflow.zip`:
- `src/components/UI.tsx`
- `src/index.css`
- `src/main.tsx`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.js` (if present)

### Step 4 — Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🌱 Seed Demo Data

On first launch, click **"Seed Demo Data"** on the Dashboard to populate:
- 5 Indian vehicles (Tata Prima, Mahindra Bolero, Ashok Leyland, etc.)
- 4 drivers with safety scores and license info
- 1 maintenance log

---

## 🔒 All Buttons & Features Wired

| Feature | Firebase Service | Status |
|---|---|---|
| Sign In / Register | Firebase Auth | ✅ |
| Forgot Password | Firebase Auth | ✅ |
| Logout | Firebase Auth | ✅ |
| Persistent auth session | `onAuthStateChanged` | ✅ |
| Add / Edit Vehicle | Firestore write | ✅ |
| Vehicle list (live) | Firestore real-time | ✅ |
| Create Trip (with validation) | Firestore write | ✅ |
| Cargo overload check | Business logic | ✅ |
| License expiry check | Business logic | ✅ |
| Complete / Cancel trip | Firestore update | ✅ |
| Vehicle status auto-update | Firestore write | ✅ |
| Driver status auto-update | Firestore write | ✅ |
| Schedule Maintenance | Firestore write | ✅ |
| Update maintenance status | Firestore update | ✅ |
| Log Trip Expense | Firestore write | ✅ |
| Dashboard stats (live) | Firestore aggregation | ✅ |
| Analytics charts | Firestore + computed | ✅ |
| Role-based menu access | Frontend + Firestore rules | ✅ |

---

## 🛡️ Trip Dispatch Validation Rules

When clicking **"Dispatch"**, the system enforces:

1. ✅ **Cargo weight ≤ Vehicle max payload** — prevents overloading
2. ✅ **Vehicle must be "Available"** — not on another trip or in shop
3. ✅ **Driver must be "Off Duty"** — not already assigned
4. ✅ **Driver license not expired** — blocks expired licenses

---

## 🚀 Deploy to Production

```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Initialize (point to your project)
firebase init

# Build and deploy
npm run deploy:all
```

---

## 🧪 Run with Local Emulators (no cloud needed)

```bash
firebase emulators:start
```

Update `src/firebase/config.ts` to connect to emulators:
```ts
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";

connectAuthEmulator(auth, "http://localhost:9099");
connectFirestoreEmulator(db, "localhost", 8080);
```
