import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  IdCard,
  Mail,
  Phone,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

const formatDayLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
};

const formatTimeLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildGroupedSlots = (slots) => {
  const groups = new Map();

  (slots || []).forEach((slot) => {
    const key = new Date(slot.start).toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(slot);
  });

  return Array.from(groups.entries()).map(([date, daySlots]) => ({
    date,
    label: formatDayLabel(daySlots[0]?.start || date),
    slots: daySlots,
  }));
};

const normalizeCurp = (value) => String(value || "").trim().toUpperCase();

const initialForm = {
  curp: "",
  nombre: "",
  fecha_nacimiento: "",
  sexo: "",
  telefono: "",
  email: "",
  motivo: "",
};

export default function PublicBookingView({ slug }) {
  const [agendaData, setAgendaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolvingCurp, setIsResolvingCurp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [resolvedPatient, setResolvedPatient] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedDay, setSelectedDay] = useState("");

  const loadAgenda = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`/api/agenda-publica/${slug}`);
      if (!response.ok) {
        throw new Error(`No se pudo cargar la agenda publica (${response.status})`);
      }
      const data = await response.json();
      setAgendaData(data);
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar la agenda publica");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, [slug]);

  const groupedSlots = useMemo(() => buildGroupedSlots(agendaData?.slots || []), [agendaData]);
  const visibleDaySlots = groupedSlots.find((group) => group.date === selectedDay) || null;
  const patientResolved = Boolean(resolvedPatient);
  const patientExists = resolvedPatient?.exists === true;

  useEffect(() => {
    if (!groupedSlots.length) {
      setSelectedDay("");
      return;
    }

    setSelectedDay((prev) => {
      if (prev && groupedSlots.some((group) => group.date === prev)) return prev;
      return groupedSlots[0].date;
    });
  }, [groupedSlots]);

  const resolveCurp = async () => {
    const normalizedCurp = normalizeCurp(form.curp);
    if (!normalizedCurp) {
      setError("Ingresa un CURP para continuar");
      return;
    }

    try {
      setIsResolvingCurp(true);
      setError("");
      const response = await fetch(`/api/agenda-publica/${slug}/paciente?curp=${encodeURIComponent(normalizedCurp)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo validar el CURP (${response.status})`);
      }

      setResolvedPatient(data);
      if (data.exists && data.patient) {
        setForm((prev) => ({
          ...prev,
          curp: normalizedCurp,
          nombre: data.patient.nombre || "",
          fecha_nacimiento: data.patient.fecha_nacimiento || "",
          sexo: data.patient.sexo || "",
          telefono: data.patient.telefono || "",
          email: data.patient.email || "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          curp: normalizedCurp,
          nombre: "",
          fecha_nacimiento: "",
          sexo: "",
          telefono: "",
          email: "",
        }));
      }
    } catch (resolveError) {
      setError(resolveError.message || "No se pudo validar el CURP");
    } finally {
      setIsResolvingCurp(false);
    }
  };

  const submit = async () => {
    if (!selectedSlot) {
      setError("Selecciona un horario disponible");
      return;
    }

    if (!form.motivo.trim()) {
      setError("Escribe el motivo de consulta");
      return;
    }

    if (!patientResolved) {
      setError("Primero valida el CURP del paciente");
      return;
    }

    if (!patientExists && (!form.nombre.trim() || !form.fecha_nacimiento || !form.sexo || !form.telefono.trim())) {
      setError("Para pacientes nuevos se requieren nombre, fecha de nacimiento, sexo y telefono");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const response = await fetch(`/api/agenda-publica/${slug}/solicitar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curp: normalizeCurp(form.curp),
          nombre: form.nombre.trim(),
          fecha_nacimiento: form.fecha_nacimiento,
          sexo: form.sexo,
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          motivo: form.motivo.trim(),
          start: selectedSlot.start,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `No se pudo solicitar la cita (${response.status})`);
      }

      setConfirmation({
        ...data,
        portalUrl: `${window.location.origin}/p/${data.portal_token}`,
      });
      await loadAgenda();
    } catch (submitError) {
      setError(submitError.message || "No se pudo solicitar la cita");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-teal-100 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-black text-teal-700">Cargando agenda publica...</p>
        </div>
      </div>
    );
  }

  if (error && !agendaData) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-lg font-black text-slate-800">No se pudo abrir esta agenda</p>
          <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const doctor = agendaData?.medico;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="rounded-[32px] border border-teal-100 bg-white/95 p-6 shadow-[0_24px_90px_-52px_rgba(13,148,136,0.45)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-[28px] bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                {doctor?.foto_data_url ? (
                  <img src={doctor.foto_data_url} alt={doctor.nombre} className="h-full w-full object-cover" />
                ) : doctor?.logo_data_url ? (
                  <img src={doctor.logo_data_url} alt={doctor.nombre} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black">{doctor?.nombre?.[0] || "D"}</span>
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-500">Agenda publica</p>
                <h1 className="mt-2 text-3xl font-black text-slate-800">{doctor?.nombre}</h1>
                <p className="mt-1 text-sm font-bold text-slate-500">{doctor?.especialidad || "Consulta general"}</p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {doctor?.consultorio} • {doctor?.direccion}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-teal-50 px-5 py-4 text-sm font-bold text-teal-700">
              <div>{doctor?.telefono || "Sin telefono"}</div>
              <div className="mt-1">{doctor?.email_contacto || "Sin email"}</div>
            </div>
          </div>
        </section>

        {confirmation ? (
          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 size={22} />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-slate-800">Tu solicitud fue enviada</p>
                <p className="text-sm font-bold text-slate-600">
                  Cita en espera para el {formatDayLabel(confirmation.cita.start)} a las{" "}
                  {formatTimeLabel(confirmation.cita.start)}.
                </p>
                <a
                  href={confirmation.portalUrl}
                  className="inline-flex rounded-2xl bg-teal-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700"
                >
                  Abrir portal del paciente
                </a>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <IdCard size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Identificate con tu CURP</h2>
                <p className="text-sm font-bold text-slate-500">
                  Primero validamos si ya eres paciente para ahorrar capturas.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500">CURP</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <IdCard size={16} className="text-teal-600" />
                  <input
                    value={form.curp}
                    onChange={(e) => setForm((prev) => ({ ...prev, curp: normalizeCurp(e.target.value) }))}
                    className="w-full bg-transparent font-bold uppercase text-slate-700 outline-none"
                    placeholder="ABCD010203HMN..."
                    maxLength={18}
                  />
                </div>
              </label>
      
              <button
                type="button"
                onClick={resolveCurp}
                disabled={isResolvingCurp}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700 disabled:opacity-60"
              >
                <Search size={16} />
                {isResolvingCurp ? "Validando CURP..." : "Continuar"}
              </button>

              {patientResolved ? (
                patientExists ? (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-700">Hola, {resolvedPatient.patient.nombre}</p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      Ya encontramos tu expediente. Solo elige horario y escribe el motivo de consulta.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4 space-y-4">
                    <div>
                      <p className="text-sm font-black text-teal-700">Paciente nuevo</p>
                      <p className="mt-1 text-sm font-bold text-teal-600">
                        Completa tus datos basicos y despues elige horario.
                      </p>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Nombre completo</span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <UserRound size={16} className="text-teal-600" />
                        <input
                          value={form.nombre}
                          onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                          className="w-full bg-transparent font-bold text-slate-700 outline-none"
                          placeholder="Ej. Ana Garcia"
                        />
                      </div>
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500">Fecha de nacimiento</span>
                        <input
                          type="date"
                          value={form.fecha_nacimiento}
                          onChange={(e) => setForm((prev) => ({ ...prev, fecha_nacimiento: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500">Sexo</span>
                        <select
                          value={form.sexo}
                          onChange={(e) => setForm((prev) => ({ ...prev, sexo: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">Selecciona una opcion</option>
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="No binario">No binario</option>
                          <option value="Prefiero no decir">Prefiero no decir</option>
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Telefono</span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <Phone size={16} className="text-teal-600" />
                        <input
                          value={form.telefono}
                          onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                          className="w-full bg-transparent font-bold text-slate-700 outline-none"
                          placeholder="6641234567"
                        />
                      </div>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Email opcional</span>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <Mail size={16} className="text-teal-600" />
                        <input
                          value={form.email}
                          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-transparent font-bold text-slate-700 outline-none"
                          placeholder="paciente@email.com"
                        />
                      </div>
                    </label>
                  </div>
                )
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Selecciona tu cita</h2>
                <p className="text-sm font-bold text-slate-500">
                  Horarios disponibles y motivo de consulta.
                </p>
              </div>
            </div>

            {patientResolved ? (
              <div className="mt-5 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">Selecciona un dia</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {groupedSlots.length ? (
                        groupedSlots.slice(0, 10).map((group) => {
                          const activeDay = group.date === selectedDay;
                          return (
                            <button
                              key={group.date}
                              type="button"
                              onClick={() => {
                                setSelectedDay(group.date);
                                setSelectedSlot(null);
                              }}
                              className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                                activeDay
                                  ? "border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-100"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                              }`}
                            >
                              <p className="text-[11px] font-black capitalize">{group.label}</p>
                              <p className={`mt-1 text-[10px] font-bold ${activeDay ? "text-teal-50" : "text-slate-500"}`}>
                                {group.slots.length} horario{group.slots.length === 1 ? "" : "s"}
                              </p>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl bg-slate-50 px-4 py-5">
                          <p className="text-sm font-bold text-slate-500">
                            No hay dias disponibles en este momento.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-500">Horarios del dia</p>
                    {visibleDaySlots ? (
                      <>
                        <p className="text-sm font-black capitalize text-slate-700">{visibleDaySlots.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {visibleDaySlots.slots.map((slot) => {
                            const active = selectedSlot?.start === slot.start;
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                                  active
                                    ? "border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-100"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                                }`}
                              >
                                {formatTimeLabel(slot.start)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-5">
                        <p className="text-sm font-bold text-slate-500">
                          Selecciona un dia para ver sus horarios disponibles.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">Horario seleccionado</p>
                  <p className="mt-1 text-sm font-black text-slate-700">
                    {selectedSlot
                      ? `${formatDayLabel(selectedSlot.start)} • ${formatTimeLabel(selectedSlot.start)}`
                      : "Aun no has seleccionado un horario"}
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Motivo de consulta</span>
                  <textarea
                    value={form.motivo}
                    onChange={(e) => setForm((prev) => ({ ...prev, motivo: e.target.value }))}
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Cuentanos brevemente el motivo de tu consulta"
                  />
                </label>

                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-teal-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Enviando solicitud..." : "Solicitar cita"}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5">
                <p className="text-sm font-bold text-slate-500">
                  Primero valida el CURP para mostrarte los horarios disponibles.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
