import React from "react";
import { Bell, Menu } from "lucide-react";

export default function Topbar({ title, onMenuToggle }) {
  return (
    <header className="flex justify-between items-center mb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <h2 className="text-3xl font-black text-slate-800 capitalize tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center">
        <div className="p-2.5 bg-white rounded-2xl border border-slate-200 text-slate-400 relative shadow-sm">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
      </div>
    </header>
  );
}
