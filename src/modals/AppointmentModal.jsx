import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Clock, User } from "lucide-react";
import AppointmentModal from "../components/AppointmentModal";

export default function AgendaView({ patients, setPatients }) {
  const [openModal, setOpenModal] = useState(false);
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      patientId: "PX-8829",
      patientName: "Ana García",
      motivo: "Seguimiento",
      tipo: "Seguimiento",
      estado: "Confirmado",
      start: new Date(),
      duracion: 30,
    },
  ]);

  const todays = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    return appointments
      .filter((a) => {
        const s = new Date(a.start);
        return (
          s.getFullYear() === y && s.getMonth() === m && s.getDate() === d
        );
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [appointments]);

  const onSave = ({ appointment, maybeNewPatient }) => {
    if (maybeNewPatient) {
      setPatients((prev) => [maybeNewPatient, ...prev]);
    }
    setAppointments((prev) => [appointment, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-800">Agenda</h3>
          <p className="text-sm text-slate-500 font-bold">
            Citas del día (demo)
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
        >
          <Plus size={18} />
          Nueva cita
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <CalendarDays size={18} />
          </div>
          <p className="font-black text-slate-800 uppercase tracking-tight">
            Hoy
          </p>
        </div>

        <div className="p-6 space-y-3">
          {todays.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 font-bold">
              No hay citas hoy.
            </div>
          ) : (
            todays.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-black text-slate-800 truncate">
                    {a.patientName}{" "}
                    <span className="text-slate-400 font-bold">
                      • {a.tipo}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} className="text-teal-500" />
                      {new Date(a.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {a.duracion} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User size={14} className="text-emerald-500" />
                      {a.estado}
                    </span>
                    {a.motivo ? (
                      <span className="text-slate-400 truncate">{a.motivo}</span>
                    ) : null}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-full ${
                    a.estado === "Confirmado"
                      ? "bg-emerald-100 text-emerald-700"
                      : a.estado === "En espera"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {a.estado}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <AppointmentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        patients={patients}
        onSave={onSave}
      />
    </div>
  );
}
