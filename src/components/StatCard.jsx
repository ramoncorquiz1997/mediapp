import React from "react";

export default function StatCard({ label, val, icon: Icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className={`${bg} ${color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{label}</p>
      <h3 className="text-3xl font-black text-slate-800 mt-1">{val}</h3>
    </div>
  );
}
