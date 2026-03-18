import React from "react";
import { Activity, LogOut } from "lucide-react";

const SidebarItem = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
      active
        ? "bg-teal-600 text-white shadow-lg shadow-teal-950/10 ring-1 ring-teal-500/30"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-bold leading-snug">{label}</span>
  </button>
);

export default function Sidebar({ activeTab, setActiveTab, items, user, onLogout }) {
  return (
    <aside className="w-72 hidden md:flex flex-col p-6 bg-slate-950 text-white border-r border-slate-900">
      <div className="h-full rounded-[28px] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] border border-white/10 p-6 shadow-2xl shadow-slate-950/30 flex flex-col">
        <div className="flex items-center space-x-3 mb-10">
          <div className="bg-teal-500 p-2.5 rounded-2xl text-white shadow-lg shadow-teal-950/30">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight italic text-white">MyCliniq</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Consultorio digital</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((it) => (
            <SidebarItem
              key={it.id}
              active={activeTab === it.id}
              icon={it.icon}
              label={it.label}
              onClick={() => setActiveTab(it.id)}
            />
          ))}
        </nav>

        <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4">
            <p className="text-sm font-black text-white">{user?.nombre || "Usuario"}</p>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300 mt-1">
              {user?.rol || "sesion"}
            </p>
            <p className="text-xs font-bold text-slate-400 mt-2">
              Cedula: {user?.cedula_profesional || "Sin registro"}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-700 font-black hover:bg-slate-100 transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
