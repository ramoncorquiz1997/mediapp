import React, { useEffect, useMemo, useState } from "react";
import { Users, Calendar, FileText, TrendingUp, Activity } from "lucide-react";

import StatCard from "../components/StatCard";
import { apiFetch } from "../lib/api";
import {
  activityTypeOptions,
  formatActivityDateTime,
  getActivityAccent,
  getActivityMessage,
  getActivityType,
  getActivityTypeLabel,
} from "../lib/activity";

const formatAppointmentTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DashboardView({ currentUser }) {
  const [stats, setStats] = useState({
    total_pacientes: 0,
    consultas_hoy: 0,
    citas_hoy: 0,
    proximas_citas: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityFilters, setActivityFilters] = useState({
    from: "",
    to: "",
    type: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await apiFetch("/api/dashboard/summary");
        if (!response.ok) {
          throw new Error(`No se pudo cargar dashboard (${response.status})`);
        }

        const data = await response.json();
        setStats(data.stats ?? {});
        setUpcomingAppointments(data.proximas_citas ?? []);

        if (["admin", "medico"].includes(currentUser?.rol)) {
          const activityResponse = await apiFetch("/api/audit-log?limit=8");
          if (!activityResponse.ok) {
            throw new Error(`No se pudo cargar actividad reciente (${activityResponse.status})`);
          }

          const activityData = await activityResponse.json();
          setRecentActivity(activityData);
        } else {
          setRecentActivity([]);
        }
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar el dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [currentUser?.rol]);

  const cards = useMemo(
    () => [
      {
        label: "Pacientes Totales",
        val: stats.total_pacientes ?? 0,
        icon: Users,
        color: "text-teal-600",
        bg: "bg-teal-50",
      },
      {
        label: "Consultas Hoy",
        val: stats.consultas_hoy ?? 0,
        icon: FileText,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "Citas Hoy",
        val: stats.citas_hoy ?? 0,
        icon: Calendar,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
      {
        label: "Proximas Citas",
        val: stats.proximas_citas ?? 0,
        icon: TrendingUp,
        color: "text-sky-600",
        bg: "bg-sky-50",
      },
    ],
    [stats]
  );

  const filteredActivity = useMemo(() => {
    return recentActivity.filter((entry) => {
      const createdAt = entry.created_at ? new Date(entry.created_at) : null;
      const matchesFrom =
        !activityFilters.from ||
        (createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt >= new Date(`${activityFilters.from}T00:00:00`)
          : false);
      const matchesTo =
        !activityFilters.to ||
        (createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt <= new Date(`${activityFilters.to}T23:59:59`)
          : false);
      const matchesType =
        !activityFilters.type || getActivityType(entry) === activityFilters.type;

      return matchesFrom && matchesTo && matchesType;
    });
  }, [activityFilters, recentActivity]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 px-6 py-4 text-sm font-bold text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} val={isLoading ? "..." : card.val} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xl text-slate-800">Proximas Citas</h3>
            <p className="text-teal-600 font-bold text-sm">
              {isLoading ? "Cargando..." : `${upcomingAppointments.length} programadas`}
            </p>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm font-bold text-slate-500">
                Cargando citas...
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm font-bold text-slate-500">
                No hay citas proximas registradas.
              </div>
            ) : (
              upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="bg-slate-100 px-3 py-2 rounded-xl text-xs font-black text-slate-600">
                      {formatAppointmentTime(appointment.start)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{appointment.paciente_nombre}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {appointment.motivo || "Consulta"} | {appointment.tipo || "Sin tipo"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      appointment.estado === "En espera"
                        ? "bg-orange-100 text-orange-600"
                        : appointment.estado === "Cancelado"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {appointment.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-teal-600 p-8 rounded-3xl text-white shadow-xl shadow-teal-100 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Resumen del dia</h3>
            <p className="text-teal-100 text-sm mb-6">
              {isLoading
                ? "Preparando informacion del consultorio..."
                : `Hoy llevas ${stats.consultas_hoy ?? 0} consultas y ${stats.citas_hoy ?? 0} citas activas.`}
            </p>
            <div className="bg-white/15 rounded-2xl px-5 py-4 inline-flex items-center gap-3">
              <span className="text-2xl font-black">{stats.total_pacientes ?? 0}</span>
              <span className="text-sm font-bold text-teal-50">pacientes en expediente</span>
            </div>
          </div>
          <Activity size={120} className="absolute -bottom-4 -right-4 text-teal-500 opacity-20" />
        </div>
      </div>

      {["admin", "medico"].includes(currentUser?.rol) ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <h3 className="font-black text-xl text-slate-800">Actividad reciente</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Eventos clinicos y operativos en lenguaje natural para seguimiento rapido
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
              <input
                type="date"
                value={activityFilters.from}
                onChange={(e) => setActivityFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
              <input
                type="date"
                value={activityFilters.to}
                onChange={(e) => setActivityFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
              <select
                value={activityFilters.type}
                onChange={(e) => setActivityFilters((prev) => ({ ...prev, type: e.target.value }))}
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

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm font-bold text-slate-500">
                Cargando actividad reciente...
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm font-bold text-slate-500">
                No hay eventos que coincidan con los filtros.
              </div>
            ) : (
              filteredActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50/70 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800">{getActivityMessage(entry)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {formatActivityDateTime(entry.created_at)} | {entry.usuario_nombre || "Sistema"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getActivityAccent(
                      entry
                    )}`}
                  >
                    {getActivityTypeLabel(entry)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
