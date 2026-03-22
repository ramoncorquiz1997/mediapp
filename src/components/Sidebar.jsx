import React from "react";
import soloLogoMycliniq from "../assets/imagenes/solo_logo_mycliniq.png";
import { LogOut, X } from "lucide-react";

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

export default function Sidebar({ activeTab, setActiveTab, items, user, onLogout, isMobileOpen, onCloseMobile }) {
  const handleSelect = (tabId) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity md:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[88vw] max-w-72 p-4 text-white transition-transform duration-300 md:static md:z-auto md:w-72 md:max-w-none md:translate-x-0 md:p-6 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } bg-slate-950 border-r border-slate-900 md:flex md:flex-col`}
      >
      <div className="h-full rounded-[28px] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] border border-white/10 p-6 shadow-2xl shadow-slate-950/30 flex flex-col">
        <div className="mb-8 flex items-start justify-between md:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300"
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center space-x-3 mb-10">
          <img
            src={soloLogoMycliniq}
            alt="MyCliniq"
            className="h-[58px] w-[58px] shrink-0 object-contain drop-shadow-[0_12px_24px_rgba(45,212,191,0.25)]"
          />
          <div>
            <h1 className="brand-wordmark text-[2.15rem] font-black leading-none tracking-[-0.05em] text-white">MyCliniq</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((it) => (
            <SidebarItem
              key={it.id}
              active={activeTab === it.id}
              icon={it.icon}
              label={it.label}
              onClick={() => handleSelect(it.id)}
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
            onClick={() => {
              onCloseMobile?.();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-700 font-black hover:bg-slate-100 transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
