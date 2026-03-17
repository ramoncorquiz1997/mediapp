import React from "react";
import { Bell } from "lucide-react";

export default function Topbar({ title }) {
  return (
    <header className="flex justify-between items-center mb-10">
      <h2 className="text-3xl font-black text-slate-800 capitalize tracking-tight">{title}</h2>

      <div className="flex items-center">
        <div className="p-2.5 bg-white rounded-2xl border border-slate-200 text-slate-400 relative shadow-sm">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </div>
      </div>
    </header>
  );
}
