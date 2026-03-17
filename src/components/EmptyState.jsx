import React from "react";

export default function EmptyState({ icon: Icon, title }) {
  return (
    <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-3xl animate-pulse">
      <Icon size={64} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-300 font-bold">{title}</p>
    </div>
  );
}
