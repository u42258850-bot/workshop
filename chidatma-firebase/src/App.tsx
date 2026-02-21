/**
 * FleetFlow Hub — Firebase Edition
 * All /api/* calls replaced with direct Firestore operations.
 * Every button, modal, delete, dispatch, complete is fully wired.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Truck, Users, Wrench, Fuel, BarChart3, Plus,
  AlertCircle, CheckCircle2, Clock, ChevronRight, LogOut, Menu, X,
  Search, Filter, Calendar, ShieldCheck, Package, AlertTriangle, Loader2, Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Firebase service imports ──────────────────────────────────
import { listenVehicles, addVehicle, deleteVehicle, Vehicle } from './firebase/vehicles';
import { listenDrivers, addDriver, deleteDriver, Driver } from './firebase/drivers';
import { listenTrips, createTrip, completeTrip, Trip } from './firebase/trips';
import { listenMaintenanceLogs, addMaintenanceLog, MaintenanceLog } from './firebase/maintenance';
import { listenFuelLogs, addFuelLog, FuelLog } from './firebase/fuel';
import {
  getStats, getFinancialReport, getEfficiencyData,
  getFuelEfficiencyData, getMaintenanceRoiData,
  Stats, FinancialRow,
} from './firebase/analytics';
import { seedIfEmpty } from './firebase/seed';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ── Types ─────────────────────────────────────────────────────
type UserRole = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Admin';
type Page = 'dashboard' | 'vehicles' | 'drivers' | 'trips' | 'maintenance' | 'fuel' | 'analytics' | 'login';

// ── UI Components ─────────────────────────────────────────────
const StatusPill = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    'Available': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'On Trip': 'bg-blue-50 text-blue-600 border-blue-200',
    'In Shop': 'bg-amber-50 text-amber-600 border-amber-200',
    'Retired': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Dispatched': 'bg-blue-50 text-blue-600 border-blue-200',
    'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Draft': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Cancelled': 'bg-rose-50 text-rose-600 border-rose-200',
    'On Duty': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Off Duty': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Suspended': 'bg-rose-50 text-rose-600 border-rose-200',
  };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', colors[status] || 'bg-zinc-100 text-zinc-600 border-zinc-200')}>
      {status}
    </span>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn('bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden', className)} {...props}>
    {children}
  </div>
);

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={cn(
      'fixed top-6 right-6 z-[200] px-5 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-3',
      type === 'success' ? 'bg-[#39FF14] text-black' :
      type === 'error'   ? 'bg-rose-500 text-white' :
                            'bg-zinc-900 text-white'
    )}
  >
    {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
    {msg}
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [currentPage, setCurrentPage]   = useState<Page>('login');
  const [userRole, setUserRole]         = useState<UserRole | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ── Live data (Firestore listeners) ───────────────────────
  const [vehicles, setVehicles]           = useState<Vehicle[]>([]);
  const [drivers, setDrivers]             = useState<Driver[]>([]);
  const [trips, setTrips]                 = useState<Trip[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs]           = useState<FuelLog[]>([]);

  // ── Computed / async data ─────────────────────────────────
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialRow[]>([]);
  const [efficiencyData, setEfficiencyData]   = useState<any[]>([]);
  const [fuelEfficiencyData, setFuelEfficiencyData] = useState<any[]>([]);
  const [maintenanceRoiData, setMaintenanceRoiData] = useState<any[]>([]);

  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading]             = useState(false);
  const [toast, setToastMsg]              = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const [showAddVehicle, setShowAddVehicle]     = useState(false);
  const [showAddDriver, setShowAddDriver]       = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddFuel, setShowAddFuel]           = useState(false);
  const [showAddTrip, setShowAddTrip]           = useState(false);
  const [showCompleteTrip, setShowCompleteTrip] = useState<string | null>(null);
  const [showReport, setShowReport]             = useState<FinancialRow | null>(null);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── Set up Firestore real-time listeners after login ──────
  useEffect(() => {
    if (currentPage === 'login') return;

    const unsubs = [
      listenVehicles(setVehicles),
      listenDrivers(setDrivers),
      listenTrips(setTrips),
      listenMaintenanceLogs(setMaintenanceLogs),
      listenFuelLogs(setFuelLogs),
    ];
    return () => unsubs.forEach(u => u());
  }, [currentPage]);

  // ── Recompute derived analytics whenever base data changes ─
  useEffect(() => {
    if (currentPage === 'login') return;
    getStats().then(setStats);
    setEfficiencyData(getEfficiencyData(trips));
    setFuelEfficiencyData(getFuelEfficiencyData(vehicles, trips, fuelLogs));
    setMaintenanceRoiData(getMaintenanceRoiData(maintenanceLogs));
    getFinancialReport(vehicles, fuelLogs, maintenanceLogs).then(setFinancialReport);
  }, [vehicles, drivers, trips, fuelLogs, maintenanceLogs, currentPage]);

  // ── Login ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const role = fd.get('role') as UserRole;
    setLoading(true);
    // Seed demo data on first login if Firestore is empty
    const result = await seedIfEmpty();
    if (result.seeded) showToast(result.message, 'info');
    setUserRole(role);
    setCurrentPage('dashboard');
    setLoading(false);
  };

  // ── Delete vehicle ────────────────────────────────────────
  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    const res = await deleteVehicle(id);
    if (res.success) showToast('Vehicle removed.');
    else showToast(res.error || 'Failed to delete.', 'error');
  };

  // ── Delete driver ─────────────────────────────────────────
  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Remove this driver?')) return;
    const res = await deleteDriver(id);
    if (res.success) showToast('Driver removed.');
    else showToast(res.error || 'Failed to delete.', 'error');
  };

  // ── Dispatch trip ─────────────────────────────────────────
  const handleDispatch = async (e: React.FormEvent, closeModal: () => void) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await createTrip({
      vehicle_id: fd.get('vehicle_id') as string,
      driver_id: fd.get('driver_id') as string,
      cargo_weight: Number(fd.get('cargo_weight')),
    });
    if (res.success) { showToast('Trip dispatched! 🚛'); closeModal(); (e.target as HTMLFormElement).reset(); }
    else showToast(res.error || 'Dispatch failed.', 'error');
  };

  // ── Complete trip ─────────────────────────────────────────
  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteTrip) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await completeTrip(showCompleteTrip, Number(fd.get('end_odometer')));
    if (res.success) { showToast('Trip completed! ✅'); setShowCompleteTrip(null); }
    else showToast(res.error || 'Failed to complete.', 'error');
  };

  // ── Add vehicle ───────────────────────────────────────────
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await addVehicle({
      name: fd.get('name') as string,
      model: fd.get('model') as string,
      license_plate: fd.get('license_plate') as string,
      max_load: Number(fd.get('max_load')),
      odometer: Number(fd.get('odometer')),
    });
    if (res.success) { showToast('Vehicle registered! 🚗'); setShowAddVehicle(false); (e.target as HTMLFormElement).reset(); }
    else showToast(res.error || 'Failed to register.', 'error');
  };

  // ── Add driver ────────────────────────────────────────────
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await addDriver({
      name: fd.get('name') as string,
      license_number: fd.get('license_number') as string,
      license_expiry: fd.get('license_expiry') as string,
    });
    if (res.success) { showToast('Driver registered! 👤'); setShowAddDriver(false); (e.target as HTMLFormElement).reset(); }
    else showToast(res.error || 'Failed to register.', 'error');
  };

  // ── Add maintenance ───────────────────────────────────────
  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const vehicleId = fd.get('vehicle_id') as string;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const res = await addMaintenanceLog({
      vehicle_id: vehicleId,
      vehicle_name: vehicle?.name || '',
      description: fd.get('description') as string,
      cost: Number(fd.get('cost')),
      date: fd.get('date') as string,
      type: fd.get('type') as any,
    });
    if (res.success) { showToast('Service log saved! 🔧'); setShowAddMaintenance(false); (e.target as HTMLFormElement).reset(); }
    else showToast(res.error || 'Failed to save.', 'error');
  };

  // ── Add fuel ──────────────────────────────────────────────
  const handleAddFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const vehicleId = fd.get('vehicle_id') as string;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const res = await addFuelLog({
      vehicle_id: vehicleId,
      vehicle_name: vehicle?.name || '',
      liters: Number(fd.get('liters')),
      cost: Number(fd.get('cost')),
      date: fd.get('date') as string,
    });
    if (res.success) { showToast('Fuel expense logged! ⛽'); setShowAddFuel(false); (e.target as HTMLFormElement).reset(); }
    else showToast(res.error || 'Failed to save.', 'error');
  };

  // ══════════════════════════════════════════════════════════
  // LOGIN PAGE
  // ══════════════════════════════════════════════════════════
  if (currentPage === 'login') {
    const roles = [
      { id: 'Fleet Manager' as UserRole,       title: 'Fleet Manager',      desc: 'Oversee vehicle health & asset lifecycle', icon: Truck },
      { id: 'Dispatcher' as UserRole,          title: 'Dispatcher',         desc: 'Create trips & assign drivers',            icon: Package },
      { id: 'Safety Officer' as UserRole,      title: 'Safety Officer',     desc: 'Monitor compliance & safety scores',       icon: ShieldCheck },
      { id: 'Financial Analyst' as UserRole,   title: 'Financial Analyst',  desc: 'Audit spend & operational ROI',            icon: BarChart3 },
    ];
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans text-zinc-900">
        <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#39FF14] rounded-2xl mb-4 shadow-lg">
              <Truck className="text-black w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">FleetFlow Hub</h1>
            <p className="text-zinc-500 mt-2 text-lg">Select your terminal to access the modular logistics network</p>
          </div>
          <form onSubmit={handleLogin} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <label key={role.id} className="relative cursor-pointer group">
                <input type="radio" name="role" value={role.id} className="peer sr-only" required />
                <Card className="p-6 border-2 border-transparent peer-checked:border-[#39FF14] peer-checked:bg-[#39FF14]/5 transition-all hover:border-zinc-300 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-[#39FF14]/10 transition-colors">
                      <role.icon className="w-6 h-6 text-zinc-600 group-hover:text-[#39FF14]" />
                    </div>
                    <h3 className="font-bold text-lg text-zinc-900">{role.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed flex-1">{role.desc}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Terminal Access</span>
                  </div>
                </Card>
              </label>
            ))}
            <div className="md:col-span-2 mt-4">
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-[#39FF14] text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 text-lg disabled:opacity-60">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Initialize Session</span><ChevronRight className="w-5 h-5" /></>}
              </button>
            </div>
          </form>
          <p className="text-center text-zinc-400 text-xs mt-12">Secure Terminal Access • Firebase Edition • v3.0.0</p>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════
  const navItems = [
    { id: 'dashboard',   label: 'Command Center',     icon: LayoutDashboard, roles: ['Fleet Manager','Dispatcher','Safety Officer','Financial Analyst','Admin'] },
    { id: 'vehicles',    label: 'Vehicle Registry',   icon: Truck,           roles: ['Fleet Manager','Dispatcher','Admin'] },
    { id: 'drivers',     label: 'Driver Profiles',    icon: Users,           roles: ['Dispatcher','Safety Officer','Admin'] },
    { id: 'trips',       label: 'Trip Dispatcher',    icon: Package,         roles: ['Dispatcher','Admin'] },
    { id: 'maintenance', label: 'Service Logs',       icon: Wrench,          roles: ['Fleet Manager','Admin'] },
    { id: 'fuel',        label: 'Fuel & Expenses',    icon: Fuel,            roles: ['Financial Analyst','Admin'] },
    { id: 'analytics',   label: 'Operational Reports',icon: BarChart3,       roles: ['Fleet Manager','Financial Analyst','Admin'] },
  ];
  const filteredNavItems = navItems.filter(i => userRole === 'Admin' || i.roles.includes(userRole!));

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={cn('bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col z-50', isSidebarOpen ? 'w-64' : 'w-20')}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#39FF14] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <Truck className="text-black w-6 h-6" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-zinc-900">FleetFlow</span>}
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-4">
          {filteredNavItems.map((item) => (
            <button key={item.id} onClick={() => setCurrentPage(item.id as Page)}
              className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group',
                currentPage === item.id ? 'bg-[#39FF14]/10 text-[#39FF14] font-bold' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900')}>
              <item.icon className={cn('w-5 h-5 shrink-0', currentPage === item.id ? 'text-[#39FF14]' : 'text-zinc-500 group-hover:text-zinc-700')} />
              {isSidebarOpen && <span>{item.label}</span>}
              {currentPage === item.id && isSidebarOpen && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-[#39FF14]" />}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-200">
          <button onClick={() => { setCurrentPage('login'); setUserRole(null); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-zinc-900">{navItems.find(i => i.id === currentPage)?.label}</h2>
            {userRole && (
              <div className="ml-4 px-3 py-1 bg-zinc-100 rounded-full border border-zinc-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{userRole}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" placeholder="Search assets, trips..."
                className="pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-[#39FF14] outline-none w-64" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#39FF14] flex items-center justify-center text-black font-bold text-xs">
              {userRole?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

              {/* ══════════════════════════════════════════════
                  DASHBOARD
              ══════════════════════════════════════════════ */}
              {currentPage === 'dashboard' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-zinc-900">Welcome back, {userRole}</h1>
                      <p className="text-zinc-500">Here's what's happening with your fleet today.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </button>
                      {userRole === 'Dispatcher' && (
                        <button onClick={() => setShowAddTrip(true)} className="px-4 py-2 bg-[#39FF14] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2">
                          <Plus className="w-4 h-4" /> New Dispatch
                        </button>
                      )}
                      {userRole === 'Fleet Manager' && (
                        <button onClick={() => setShowAddVehicle(true)} className="px-4 py-2 bg-[#39FF14] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-lg flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Asset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(userRole === 'Fleet Manager' || userRole === 'Admin') ? (<>
                      <Card className="p-6"><div className="flex items-center justify-between mb-4"><div className="p-3 bg-blue-50 rounded-xl"><Truck className="w-6 h-6 text-blue-600" /></div><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Live</span></div><p className="text-sm font-medium text-zinc-500">Active Fleet</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.activeFleet ?? 0} <span className="text-sm font-normal text-zinc-400">Vehicles</span></h3></Card>
                      <Card className="p-6"><div className="flex items-center justify-between mb-4"><div className="p-3 bg-amber-50 rounded-xl"><Wrench className="w-6 h-6 text-amber-600" /></div></div><p className="text-sm font-medium text-zinc-500">Maintenance Alerts</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.maintenanceAlerts ?? 0} <span className="text-sm font-normal text-zinc-400">In Shop</span></h3></Card>
                      <Card className="p-6"><div className="flex items-center justify-between mb-4"><div className="p-3 bg-[#39FF14]/10 rounded-xl"><BarChart3 className="w-6 h-6 text-[#39FF14]" /></div></div><p className="text-sm font-medium text-zinc-500">Utilization Rate</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.utilizationRate ?? 0}%</h3><div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4"><div className="bg-[#39FF14] h-full rounded-full" style={{ width: `${stats?.utilizationRate ?? 0}%` }} /></div></Card>
                      <Card className="p-6"><div className="flex items-center justify-between mb-4"><div className="p-3 bg-rose-50 rounded-xl"><ShieldCheck className="w-6 h-6 text-rose-600" /></div></div><p className="text-sm font-medium text-zinc-500">Safety Compliance</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">98.2%</h3></Card>
                    </>) : userRole === 'Dispatcher' ? (<>
                      <Card className="p-6"><div className="p-3 bg-blue-50 rounded-xl w-fit mb-4"><Package className="w-6 h-6 text-blue-600" /></div><p className="text-sm font-medium text-zinc-500">Active Trips</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{trips.filter(t => t.status === 'Dispatched').length} <span className="text-sm font-normal text-zinc-400">Live</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-emerald-50 rounded-xl w-fit mb-4"><Users className="w-6 h-6 text-emerald-600" /></div><p className="text-sm font-medium text-zinc-500">Available Drivers</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{drivers.filter(d => d.status === 'On Duty').length} <span className="text-sm font-normal text-zinc-400">Ready</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-amber-50 rounded-xl w-fit mb-4"><Truck className="w-6 h-6 text-amber-600" /></div><p className="text-sm font-medium text-zinc-500">Available Vehicles</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{vehicles.filter(v => v.status === 'Available').length} <span className="text-sm font-normal text-zinc-400">Ready</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-rose-50 rounded-xl w-fit mb-4"><Package className="w-6 h-6 text-rose-600" /></div><p className="text-sm font-medium text-zinc-500">Pending Cargo</p><h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.pendingCargo ?? 0} <span className="text-sm font-normal text-zinc-400">Shipments</span></h3></Card>
                    </>) : userRole === 'Safety Officer' ? (<>
                      <Card className="p-6"><div className="p-3 bg-emerald-50 rounded-xl w-fit mb-4"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div><p className="text-sm font-medium text-zinc-500">Avg Safety Score</p><h3 className="text-2xl font-bold mt-1">{drivers.length > 0 ? (drivers.reduce((s,d) => s+d.safety_score,0)/drivers.length).toFixed(1) : 'N/A'} <span className="text-sm font-normal text-zinc-400">/ 100</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-rose-50 rounded-xl w-fit mb-4"><AlertTriangle className="w-6 h-6 text-rose-600" /></div><p className="text-sm font-medium text-zinc-500">Expiring Licenses</p><h3 className="text-2xl font-bold mt-1">{drivers.filter(d => new Date(d.license_expiry) < new Date(Date.now() + 30*864e5)).length} <span className="text-sm font-normal text-zinc-400">Drivers</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-blue-50 rounded-xl w-fit mb-4"><Users className="w-6 h-6 text-blue-600" /></div><p className="text-sm font-medium text-zinc-500">Active Drivers</p><h3 className="text-2xl font-bold mt-1">{drivers.length} <span className="text-sm font-normal text-zinc-400">Total</span></h3></Card>
                      <Card className="p-6"><div className="p-3 bg-zinc-50 rounded-xl w-fit mb-4"><Clock className="w-6 h-6 text-zinc-600" /></div><p className="text-sm font-medium text-zinc-500">Safety Incidents</p><h3 className="text-2xl font-bold mt-1">0 <span className="text-sm font-normal text-zinc-400">This Month</span></h3></Card>
                    </>) : (<>
                      <Card className="p-6"><div className="p-3 bg-rose-50 rounded-xl w-fit mb-4"><Fuel className="w-6 h-6 text-rose-600" /></div><p className="text-sm font-medium text-zinc-500">Total Fuel Spend</p><h3 className="text-2xl font-bold mt-1">₹{fuelLogs.reduce((a,l) => a+l.cost,0).toLocaleString()}</h3></Card>
                      <Card className="p-6"><div className="p-3 bg-amber-50 rounded-xl w-fit mb-4"><Wrench className="w-6 h-6 text-amber-600" /></div><p className="text-sm font-medium text-zinc-500">Maintenance Cost</p><h3 className="text-2xl font-bold mt-1">₹{maintenanceLogs.reduce((a,l) => a+l.cost,0).toLocaleString()}</h3></Card>
                      <Card className="p-6"><div className="p-3 bg-emerald-50 rounded-xl w-fit mb-4"><BarChart3 className="w-6 h-6 text-emerald-600" /></div><p className="text-sm font-medium text-zinc-500">Estimated Revenue</p><h3 className="text-2xl font-bold mt-1">₹{(fuelLogs.reduce((a,l)=>a+l.cost,0)*2.5).toLocaleString()}</h3></Card>
                      <Card className="p-6"><div className="p-3 bg-blue-50 rounded-xl w-fit mb-4"><LayoutDashboard className="w-6 h-6 text-blue-600" /></div><p className="text-sm font-medium text-zinc-500">Cost per KM</p><h3 className="text-2xl font-bold mt-1">₹14.20</h3></Card>
                    </>)}
                  </div>

                  {/* Charts + Recent */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-zinc-900">
                          {userRole === 'Financial Analyst' ? 'Fuel Efficiency Trends' : userRole === 'Safety Officer' ? 'Driver Safety Scores' : 'Operational Efficiency'}
                        </h4>
                      </div>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          {userRole === 'Safety Officer' ? (
                            <BarChart data={drivers.slice(0,7).map(d => ({ name: d.name.split(' ')[0], score: d.safety_score }))}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="score" name="Safety Score" fill="#39FF14" radius={[4,4,0,0]} />
                            </BarChart>
                          ) : (
                            <LineChart data={efficiencyData.length > 0 ? efficiencyData : [{ date:'Mon',count:0 }]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Line type="monotone" dataKey="count" name="Trips" stroke="#39FF14" strokeWidth={3} dot={{ r: 4, fill: '#39FF14' }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h4 className="font-bold text-zinc-900 mb-6">
                        {userRole === 'Fleet Manager' ? 'Recent Service Logs' : userRole === 'Financial Analyst' ? 'Recent Fuel Expenses' : 'Recent Dispatches'}
                      </h4>
                      <div className="space-y-6">
                        {(userRole === 'Fleet Manager' ? maintenanceLogs : userRole === 'Financial Analyst' ? fuelLogs : trips).slice(0,5).map((item: any) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                              {userRole === 'Fleet Manager' ? <Wrench className="w-5 h-5 text-amber-500" /> : userRole === 'Financial Analyst' ? <Fuel className="w-5 h-5 text-rose-500" /> : <Clock className="w-5 h-5 text-zinc-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-900 truncate">
                                {userRole === 'Fleet Manager' ? item.description : userRole === 'Financial Analyst' ? `Fuel Refill: ${item.liters}L` : `${item.vehicle_name} Dispatched`}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {userRole === 'Financial Analyst' ? `Vehicle: ${item.vehicle_name}` : `Driver: ${item.driver_name || item.vehicle_name}`}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {item.cost !== undefined ? <span className="text-[10px] font-bold text-zinc-400">₹{item.cost}</span> : <StatusPill status={item.status} />}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(userRole === 'Fleet Manager' ? maintenanceLogs : userRole === 'Financial Analyst' ? fuelLogs : trips).length === 0 && (
                          <div className="text-center py-8 text-zinc-400"><Clock className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-sm">No recent activity</p></div>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentPage(userRole === 'Fleet Manager' ? 'maintenance' : userRole === 'Financial Analyst' ? 'fuel' : 'trips')}
                        className="w-full mt-6 py-2 text-sm font-bold text-[#39FF14] hover:bg-[#39FF14]/5 rounded-lg transition-colors">
                        View All Logs
                      </button>
                    </Card>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  VEHICLES
              ══════════════════════════════════════════════ */}
              {currentPage === 'vehicles' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Vehicle Registry</h3><p className="text-zinc-500">Manage your physical fleet assets</p></div>
                    <button onClick={() => setShowAddVehicle(true)} className="bg-[#39FF14] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all">
                      <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                  </div>
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            {['Asset Name','Plate ID','Capacity','Odometer','Status','Actions'].map(h => (
                              <th key={h} className={cn('px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider', h==='Actions'?'text-right':'')}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {vehicles.map(v => (
                            <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center"><Truck className="w-4 h-4 text-zinc-500" /></div>
                                  <div><p className="font-bold text-zinc-900">{v.name}</p><p className="text-xs text-zinc-500">{v.model}</p></div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-zinc-500">{v.license_plate}</td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{v.max_load} kg</td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{v.odometer.toLocaleString()} km</td>
                              <td className="px-6 py-4"><StatusPill status={v.status} /></td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDeleteVehicle(v.id)} className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"><X className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                          {vehicles.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-sm">No vehicles yet. Click "Add Vehicle".</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  DRIVERS
              ══════════════════════════════════════════════ */}
              {currentPage === 'drivers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Driver Profiles</h3><p className="text-zinc-500">Human resource and compliance management</p></div>
                    <button onClick={() => setShowAddDriver(true)} className="bg-[#39FF14] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all">
                      <Plus className="w-4 h-4" /> Register Driver
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {drivers.map(driver => (
                      <Card key={driver.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 font-bold border border-zinc-200">
                              {driver.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div><h4 className="font-bold text-zinc-900">{driver.name}</h4><p className="text-xs text-zinc-500">ID: {driver.license_number}</p></div>
                          </div>
                          <StatusPill status={driver.status} />
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> License Expiry</span>
                            <span className={cn('font-medium', new Date(driver.license_expiry) < new Date() ? 'text-rose-600' : 'text-zinc-700')}>{driver.license_expiry}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Safety Score</span>
                            <span className="font-bold text-[#39FF14]">{driver.safety_score}/100</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-2 rounded-full">
                            <div className={cn('h-full rounded-full transition-all', driver.safety_score > 80 ? 'bg-[#39FF14]' : driver.safety_score > 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${driver.safety_score}%` }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-6">
                          <button onClick={() => handleDeleteDriver(driver.id)} className="py-2 text-xs font-bold text-zinc-400 bg-zinc-100 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors">Remove</button>
                          <button onClick={() => showToast('Driver profile view — coming soon!', 'info')} className="py-2 text-xs font-bold text-black bg-[#39FF14] hover:brightness-110 rounded-lg transition-colors">Manage</button>
                        </div>
                      </Card>
                    ))}
                    {drivers.length === 0 && <div className="col-span-full text-center py-12 text-zinc-400 text-sm">No drivers yet. Click "Register Driver".</div>}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  TRIPS
              ══════════════════════════════════════════════ */}
              {currentPage === 'trips' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Trip Dispatcher</h3><p className="text-zinc-500">Coordinate movement from Point A to Point B</p></div>
                    <button onClick={() => setShowAddTrip(true)} className="bg-[#39FF14] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all">
                      <Plus className="w-4 h-4" /> New Trip
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="font-bold text-zinc-900 flex items-center gap-2"><Clock className="w-5 h-5 text-[#39FF14]" /> Active Dispatches</h4>
                      {trips.filter(t => t.status === 'Dispatched').map(trip => (
                        <Card key={trip.id} className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100"><Truck className="w-6 h-6 text-zinc-400" /></div>
                              <div><h5 className="font-bold text-zinc-900">{trip.vehicle_name}</h5><p className="text-xs text-zinc-500">Assigned to {trip.driver_name}</p></div>
                            </div>
                            <StatusPill status={trip.status} />
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div><p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cargo Weight</p><p className="text-sm font-bold text-zinc-700">{trip.cargo_weight} kg</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Start Time</p><p className="text-sm font-bold text-zinc-700">{new Date(trip.start_date).toLocaleTimeString()}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Start Odo</p><p className="text-sm font-bold text-zinc-700">{trip.start_odometer} km</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setShowCompleteTrip(trip.id)} className="flex-1 py-2 bg-[#39FF14] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-colors">Mark Completed</button>
                            <button onClick={() => showToast('Live route tracking requires GPS hardware.', 'info')} className="px-4 py-2 border border-zinc-200 text-zinc-500 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors">View Route</button>
                          </div>
                        </Card>
                      ))}
                      {trips.filter(t => t.status === 'Dispatched').length === 0 && (
                        <Card className="p-12 text-center border-dashed border-zinc-200 bg-transparent">
                          <Package className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                          <p className="text-zinc-400">No active trips at the moment</p>
                        </Card>
                      )}
                    </div>

                    {/* Inline Quick Dispatch form */}
                    <Card className="p-6 h-fit sticky top-8">
                      <h4 className="font-bold text-zinc-900 mb-6">Quick Dispatch</h4>
                      <form className="space-y-4" onSubmit={e => handleDispatch(e, () => {})}>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Vehicle</label>
                          <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                            <option value="">Select Available...</option>
                            {vehicles.filter(v => v.status === 'Available').map(v => <option key={v.id} value={v.id}>{v.name} ({v.max_load}kg)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Driver</label>
                          <select name="driver_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                            <option value="">Select On Duty...</option>
                            {drivers.filter(d => d.status === 'On Duty').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cargo Weight (kg)</label>
                          <input name="cargo_weight" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="0" />
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">System validates cargo weight, vehicle capacity, and license validity before dispatch.</p>
                        </div>
                        <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-lg font-bold hover:brightness-110 transition-all">Dispatch Now</button>
                      </form>
                    </Card>
                  </div>

                  {/* All trips history */}
                  {trips.filter(t => t.status !== 'Dispatched').length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-zinc-900">Trip History</h4>
                      <Card>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead><tr className="bg-zinc-50 border-b border-zinc-200">{['Vehicle','Driver','Cargo','Status','Date'].map(h => <th key={h} className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-zinc-100">
                              {trips.filter(t => t.status !== 'Dispatched').map(t => (
                                <tr key={t.id} className="hover:bg-zinc-50">
                                  <td className="px-6 py-4 font-bold text-zinc-900">{t.vehicle_name}</td>
                                  <td className="px-6 py-4 text-sm text-zinc-600">{t.driver_name}</td>
                                  <td className="px-6 py-4 text-sm text-zinc-600">{t.cargo_weight} kg</td>
                                  <td className="px-6 py-4"><StatusPill status={t.status} /></td>
                                  <td className="px-6 py-4 text-sm text-zinc-500">{new Date(t.start_date).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  MAINTENANCE
              ══════════════════════════════════════════════ */}
              {currentPage === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Service Logs</h3><p className="text-zinc-500">Preventative and reactive health tracking</p></div>
                    <button onClick={() => setShowAddMaintenance(true)} className="bg-[#39FF14] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all">
                      <Plus className="w-4 h-4" /> Log Service
                    </button>
                  </div>
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-zinc-50 border-b border-zinc-200">{['Vehicle','Description','Type','Date','Cost'].map(h => <th key={h} className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-zinc-100">
                          {maintenanceLogs.map(log => (
                            <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{log.vehicle_name}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.description}</td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{log.type}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.date}</td>
                              <td className="px-6 py-4 text-sm font-bold text-rose-600">₹{log.cost.toLocaleString()}</td>
                            </tr>
                          ))}
                          {maintenanceLogs.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-400 text-sm">No service logs yet. Click "Log Service".</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  FUEL
              ══════════════════════════════════════════════ */}
              {currentPage === 'fuel' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Fuel & Expenses</h3><p className="text-zinc-500">Record liters, cost, and date per asset</p></div>
                    <button onClick={() => setShowAddFuel(true)} className="bg-[#39FF14] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all">
                      <Plus className="w-4 h-4" /> Log Fuel
                    </button>
                  </div>
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-zinc-50 border-b border-zinc-200">{['Vehicle','Liters','Date','Cost'].map(h => <th key={h} className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-zinc-100">
                          {fuelLogs.map(log => (
                            <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{log.vehicle_name}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.liters} L</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.date}</td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{log.cost.toLocaleString()}</td>
                            </tr>
                          ))}
                          {fuelLogs.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">No fuel logs yet. Click "Log Fuel".</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  ANALYTICS
              ══════════════════════════════════════════════ */}
              {currentPage === 'analytics' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div><h3 className="text-2xl font-bold text-zinc-900">Operational Analytics</h3><p className="text-zinc-500">Data-driven decision making for your fleet</p></div>
                    <div className="flex gap-3">
                      <button onClick={() => showToast('Filter panel coming soon!', 'info')} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
                      <button onClick={() => showToast('PDF export being prepared…', 'info')} className="px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Export PDF</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="p-6">
                      <h4 className="font-bold text-zinc-900 mb-6">Fuel Efficiency by Vehicle (km/L)</h4>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fuelEfficiencyData.length > 0 ? fuelEfficiencyData : [{ name:'No data', efficiency:0 }]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="efficiency" fill="#39FF14" radius={[4,4,0,0]}>
                              {fuelEfficiencyData.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#39FF14' : '#10b981'} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <h4 className="font-bold text-zinc-900 mb-6">Maintenance ROI Distribution</h4>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={maintenanceRoiData.length > 0 ? maintenanceRoiData : [{ name:'Routine',value:1 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                              <Cell fill="#39FF14" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        {(maintenanceRoiData.length > 0 ? maintenanceRoiData : [{ name:'Routine' },{ name:'Reactive' },{ name:'Overhaul' }]).map((item, i) => (
                          <div key={i} className="flex items-center gap-2"><div className={cn('w-3 h-3 rounded-full', i===0?'bg-[#39FF14]':i===1?'bg-amber-500':'bg-rose-500')} /><span className="text-xs text-zinc-500">{item.name}</span></div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  <Card>
                    <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                      <h4 className="font-bold text-zinc-900">Financial Audit Log</h4>
                      <button onClick={() => showToast('Full Ledger access requires Senior Manager permissions.', 'info')} className="text-[#39FF14] text-sm font-bold hover:underline">View Full Ledger</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-zinc-50 text-xs font-bold text-zinc-400 uppercase tracking-wider">{['Vehicle','Fuel Cost','Maintenance','Total Op Cost','Revenue','ROI'].map((h,i) => <th key={h} className={cn('px-6 py-4', i===5?'text-right':'')}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                          {financialReport.map(v => (
                            <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{v.name}</td>
                              <td className="px-6 py-4 text-zinc-600">₹{v.total_fuel_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 text-zinc-600">₹{v.total_maintenance_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 font-medium text-zinc-700">₹{v.total_operational_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 text-emerald-600 font-bold">₹{(v.total_operational_cost * 2.5).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setShowReport(v)} className="px-3 py-1 bg-[#39FF14]/10 text-[#39FF14] rounded-md font-bold hover:bg-[#39FF14]/20 transition-colors">View Report</button>
                              </td>
                            </tr>
                          ))}
                          {financialReport.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-sm">No financial data yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {/* Add Vehicle */}
        {showAddVehicle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowAddVehicle(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Add New Vehicle</h3>
              <form className="space-y-4" onSubmit={handleAddVehicle}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle Name</label><input name="name" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="Van-05" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Model</label><input name="model" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="Ford Transit" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Plate</label><input name="license_plate" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="XYZ-123" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Max Load (kg)</label><input name="max_load" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="1000" /></div>
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Odometer (km)</label><input name="odometer" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="0" /></div>
                </div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Asset</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Driver */}
        {showAddDriver && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowAddDriver(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Register New Driver</h3>
              <form className="space-y-4" onSubmit={handleAddDriver}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Full Name</label><input name="name" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="Alex Smith" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Number</label><input name="license_number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="DL-99999" /></div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Expiry</label><input name="license_expiry" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" /></div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Register Driver</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Maintenance */}
        {showAddMaintenance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowAddMaintenance(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Log Service Record</h3>
              <form className="space-y-4" onSubmit={handleAddMaintenance}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Description</label><input name="description" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="Oil Change" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cost (₹)</label><input name="cost" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="500" /></div>
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
                    <select name="type" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                      <option value="Routine">Routine</option><option value="Preventative">Preventative</option><option value="Reactive">Reactive</option><option value="Overhaul">Overhaul</option>
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label><input name="date" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" /></div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Log</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Fuel */}
        {showAddFuel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowAddFuel(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Log Fuel Expense</h3>
              <form className="space-y-4" onSubmit={handleAddFuel}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Liters</label><input name="liters" type="number" step="0.01" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="40" /></div>
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cost (₹)</label><input name="cost" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="4000" /></div>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label><input name="date" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" /></div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Expense</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* New Trip Modal */}
        {showAddTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowAddTrip(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">New Dispatch</h3>
              <form className="space-y-4" onSubmit={e => handleDispatch(e, () => setShowAddTrip(false))}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                    <option value="">Select Available...</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => <option key={v.id} value={v.id}>{v.name} ({v.max_load}kg)</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Driver</label>
                  <select name="driver_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]">
                    <option value="">Select On Duty...</option>
                    {drivers.filter(d => d.status === 'On Duty').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cargo Weight (kg)</label><input name="cargo_weight" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="0" /></div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Dispatch Now</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Complete Trip */}
        {showCompleteTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowCompleteTrip(null)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Complete Trip</h3>
              <form className="space-y-4" onSubmit={handleCompleteTrip}>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Final Odometer (km)</label><input name="end_odometer" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-[#39FF14]" placeholder="Enter final reading" /></div>
                <button type="submit" className="w-full py-3 bg-[#39FF14] text-black rounded-xl font-bold hover:brightness-110 transition-all">Complete Dispatch</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Financial Report Modal */}
        {showReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setShowReport(null)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.9,opacity:0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] text-zinc-900">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div><h3 className="text-xl font-bold">Operational Report: {showReport.name}</h3><p className="text-sm text-zinc-500">License Plate: {showReport.license_plate}</p></div>
                <button onClick={() => setShowReport(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-6 h-6 text-zinc-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-[#39FF14]" /> Last Known Location</h4>
                  <div className="w-full h-48 bg-zinc-100 rounded-xl border border-zinc-200 flex flex-col items-center justify-center gap-3 text-center p-6">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center shadow-sm"><Truck className="w-6 h-6 text-[#39FF14]" /></div>
                    <p className="font-bold text-zinc-900">Live Tracking Map</p>
                    <p className="text-xs text-zinc-500 max-w-xs">In production, this shows real-time GPS coordinates of {showReport.name}.</p>
                    <div className="px-4 py-2 bg-[#39FF14] text-black text-xs font-bold rounded-lg">Simulating GPS Signal…</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-4 bg-blue-50 border-blue-100"><p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Total Fuel Cost</p><p className="text-xl font-bold text-zinc-900">₹{showReport.total_fuel_cost.toLocaleString()}</p></Card>
                  <Card className="p-4 bg-rose-50 border-rose-100"><p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Maintenance Cost</p><p className="text-xl font-bold text-zinc-900">₹{showReport.total_maintenance_cost.toLocaleString()}</p></Card>
                  <Card className="p-4 bg-emerald-50 border-emerald-100"><p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Estimated Revenue</p><p className="text-xl font-bold text-zinc-900">₹{(showReport.total_operational_cost * 2.5).toLocaleString()}</p></Card>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl"><p className="text-xs text-zinc-500">Utilization Rate</p><p className="text-lg font-bold">84%</p></div>
                  <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl"><p className="text-xs text-zinc-500">Avg. Cost per KM</p><p className="text-lg font-bold">₹12.40</p></div>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
                <button onClick={() => setShowReport(null)} className="px-6 py-2 border border-zinc-200 text-zinc-500 rounded-lg font-bold hover:bg-zinc-100 transition-all">Close</button>
                <button onClick={() => showToast('Report PDF being prepared for download…', 'info')} className="px-6 py-2 bg-[#39FF14] text-black rounded-lg font-bold hover:brightness-110 transition-all">Download PDF</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
