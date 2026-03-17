import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";
import {
  activityTypeOptions,
  formatActivityDateTime,
  getActivityAccent,
  getActivityMessage,
  getActivityType,
  getActivityTypeLabel,
} from "../lib/activity";

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    type: "",
  });

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        setError("");

        const query = new URLSearchParams();
        if (filters.from) query.set("from", filters.from);
        if (filters.to) query.set("to", filters.to);
        query.set("limit", "200");

        const response = await apiFetch(`/api/audit-log?${query.toString()}`);
        if (!response.ok) {
          throw new Error(`No se pudo cargar bitacora (${response.status})`);
        }

        const data = await response.json();
        setLogs(data);
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar la bitacora");
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [filters.from, filters.to]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (!filters.type) return true;
      return getActivityType(entry) === filters.type;
    });
  }, [filters.type, logs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800">Bitacora de auditoria</h3>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Accesos, consultas a datos sensibles, descargas y actividad del sistema
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Desde</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Hasta</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Evento</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              >
                {activityTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm font-bold text-red-600">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm font-bold text-slate-500">Cargando bitacora...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-sm font-bold text-slate-500">No hay eventos para los filtros seleccionados.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((entry) => (
              <div key={entry.id} className="px-6 py-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800">{getActivityMessage(entry)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                      <span>{formatActivityDateTime(entry.created_at)}</span>
                      <span>•</span>
                      <span>{entry.usuario_nombre || "Sistema"}</span>
                      <span>•</span>
                      <span>{entry.entidad}{entry.entidad_id ? ` #${entry.entidad_id}` : ""}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getActivityAccent(
                        entry
                      )}`}
                    >
                      {getActivityTypeLabel(entry)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {entry.accion}
                    </span>
                  </div>
                </div>

                {entry.detalle && Object.keys(entry.detalle).length ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-500">
                      {JSON.stringify(entry.detalle, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
