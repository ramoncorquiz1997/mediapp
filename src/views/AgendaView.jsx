import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  Search,
  X,
  CheckCircle2,
  Timer,
  RotateCw,
  Pencil,
  Ban,
  Stethoscope,
  FileText,
  UserCheck,
  CircleOff,
  ClipboardCheck,
  MessageCircle,
  BellRing,
} from "lucide-react";
import { apiFetch } from "../lib/api";

const pad2 = (n) => String(n).padStart(2, "0");

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtDayShort = (d) =>
  d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");

const fmtMonth = (d) =>
  d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

const fmtDayNumber = (d) => d.getDate();

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  return `${y}-${m}-${da}`;
};

const parseDateTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const normalizeAppointment = (appointment) => {
  const parsedStart =
    appointment.start instanceof Date ? appointment.start : new Date(appointment.start);

  return {
    ...appointment,
    paciente_id: appointment.paciente_id ?? null,
    paciente: appointment.paciente ?? appointment.paciente_nombre ?? "Paciente sin nombre",
    portal_token: appointment.portal_token ?? "",
    paciente_telefono: appointment.paciente_telefono ?? "",
    start: isValidDate(parsedStart) ? parsedStart : new Date(),
    duracion: Number(appointment.duracion) || 30,
    cuestionario_id: appointment.cuestionario_id ?? null,
    cuestionario_motivo_consulta: appointment.cuestionario_motivo_consulta ?? "",
    cuestionario_sintomas_actuales: appointment.cuestionario_sintomas_actuales ?? "",
    cuestionario_medicamentos_actuales: appointment.cuestionario_medicamentos_actuales ?? "",
    cuestionario_alergias_conocidas: appointment.cuestionario_alergias_conocidas ?? "",
    cuestionario_cambios_desde_ultima_visita: appointment.cuestionario_cambios_desde_ultima_visita ?? "",
    cuestionario_actualizado_at: appointment.cuestionario_actualizado_at ?? null,
    consulta_id: appointment.consulta_id ?? null,
    consulta_fecha: appointment.consulta_fecha ?? null,
    consulta_diagnostico: appointment.consulta_diagnostico ?? "",
    consulta_cie10_codigo: appointment.consulta_cie10_codigo ?? "",
    consulta_cie10_descripcion: appointment.consulta_cie10_descripcion ?? "",
  };
};

const minutesFromMidnight = (date) => date.getHours() * 60 + date.getMinutes();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const DEFAULT_TYPES = ["Primera vez", "Seguimiento", "Resultados", "Urgencia"];
const DEFAULT_STATUS = ["Confirmado", "En espera", "En consulta", "Cancelado", "Completado", "No asistio"];
const STATUS_APPEARANCE = {
  Confirmado: {
    card: "border-emerald-200 bg-white shadow-emerald-100/70",
    accentBar: "bg-emerald-400",
    pill: "bg-emerald-100 text-emerald-700",
    legend: "border-emerald-200 bg-emerald-50 text-emerald-900",
    colorCode: "#34D399",
  },
  "En espera": {
    card: "border-orange-200 bg-white shadow-orange-100/70",
    accentBar: "bg-orange-400",
    pill: "bg-orange-100 text-orange-700",
    legend: "border-orange-200 bg-orange-50 text-orange-900",
    colorCode: "#FB923C",
  },
  "En consulta": {
    card: "border-teal-200 bg-white shadow-teal-100/80",
    accentBar: "bg-teal-500",
    pill: "bg-teal-100 text-teal-700",
    legend: "border-teal-200 bg-teal-50 text-teal-900",
    colorCode: "#14B8A6",
  },
  Cancelado: {
    card: "border-red-200 bg-white shadow-red-100/70",
    accentBar: "bg-red-400",
    pill: "bg-red-100 text-red-700",
    legend: "border-red-200 bg-red-50 text-red-900",
    colorCode: "#F87171",
  },
  Completado: {
    card: "border-sky-200 bg-white shadow-sky-100/80",
    accentBar: "bg-sky-400",
    pill: "bg-sky-100 text-sky-700",
    legend: "border-sky-200 bg-sky-50 text-sky-900",
    colorCode: "#38BDF8",
  },
  "No asistio": {
    card: "border-slate-300 bg-white shadow-slate-100/80",
    accentBar: "bg-slate-300",
    pill: "bg-slate-200 text-slate-700",
    legend: "border-slate-200 bg-slate-100 text-slate-800",
    colorCode: "#CBD5E1",
  },
};

const getStatusAppearance = (status) =>
  STATUS_APPEARANCE[status] || {
    card: "border-slate-300 bg-white shadow-slate-100/80",
    accentBar: "bg-slate-300",
    pill: "bg-slate-200 text-slate-700",
    legend: "border-slate-200 bg-slate-100 text-slate-800",
    colorCode: "#CBD5E1",
  };

const statusLabel = (status) => {
  if (status === "No asistio") return "No asistio";
  return status;
};

const normalizeWhatsAppPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  return digits;
};

const buildPortalUrl = (token) => {
  if (!token || typeof window === "undefined") return "";

  try {
    return new URL(`/p/${encodeURIComponent(String(token))}`, window.location.origin).toString();
  } catch {
    return "";
  }
};

const formatAppointmentDateLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "fecha pendiente";

  return date.toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isWithinNext24Hours = (value) => {
  const start = new Date(value);
  const diff = start.getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};

const buildWhatsAppLink = (appointment, variant = "confirmacion") => {
  const portalUrl = buildPortalUrl(appointment.portal_token);
  const phone = normalizeWhatsAppPhone(appointment.paciente_telefono);
  const greeting = appointment.paciente ? `Hola ${appointment.paciente},` : "Hola,";
  const lines =
    variant === "recordatorio"
      ? [
          greeting,
          `Te recordamos tu cita en ${formatAppointmentDateLabel(appointment.start)}.`,
          "Puedes revisar tu portal del paciente y completar tu cuestionario previo aqui:",
          portalUrl,
        ]
      : [
          greeting,
          `Tu cita ha sido confirmada para ${formatAppointmentDateLabel(appointment.start)}.`,
          "Aqui esta tu link de acceso al portal del paciente:",
          portalUrl,
          "Por favor llena tu cuestionario previo antes de acudir a consulta.",
        ];

  try {
    const url = new URL(phone ? `https://wa.me/${phone}` : "https://wa.me/");
    url.searchParams.set("text", lines.filter(Boolean).join("\n"));
    return url.toString();
  } catch {
    return "";
  }
};

function AppointmentModal({
  open,
  onClose,
  onSave,
  onCancelAppointment,
  initialDateTime,
  initialAppointment,
  isSaving,
  patients,
}) {
  const [form, setForm] = useState({
    paciente_id: "",
    paciente: "",
    motivo: "",
    tipo: "Seguimiento",
    estado: "Confirmado",
    fecha: "",
    hora: "",
    duracion: 30,
  });
  const [questionnaireLogged, setQuestionnaireLogged] = useState(false);

  useEffect(() => {
    if (!open) return;

    const candidateDate = initialAppointment?.start ?? initialDateTime ?? new Date();
    const sourceDate = isValidDate(candidateDate) ? candidateDate : new Date();
    setForm({
      paciente_id: initialAppointment?.paciente_id ? String(initialAppointment.paciente_id) : "",
      paciente: initialAppointment?.paciente || "",
      motivo: initialAppointment?.motivo || "",
      tipo: initialAppointment?.tipo || "Seguimiento",
      estado: initialAppointment?.estado || "Confirmado",
      fecha: toISODate(sourceDate),
      hora: `${pad2(sourceDate.getHours())}:${pad2(sourceDate.getMinutes())}`,
      duracion: initialAppointment?.duracion || 30,
    });
  }, [open, initialAppointment, initialDateTime]);

  useEffect(() => {
    if (!open) {
      setQuestionnaireLogged(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialAppointment?.cuestionario_id || questionnaireLogged) return;

    let cancelled = false;

    const logQuestionnaireReview = async () => {
      try {
        const response = await apiFetch(`/api/citas/${initialAppointment.id}/review-questionnaire`, {
          method: "POST",
        });

        if (!cancelled && response.ok) {
          setQuestionnaireLogged(true);
        }
      } catch {
        // Ignore audit failures in the UI flow.
      }
    };

    logQuestionnaireReview();

    return () => {
      cancelled = true;
    };
  }, [open, initialAppointment?.id, initialAppointment?.cuestionario_id, questionnaireLogged]);

  if (!open) return null;

  const isEditing = Boolean(initialAppointment?.id);
  const hasQuestionnaire = Boolean(initialAppointment?.cuestionario_id);

  const update = (e) => {
    const { name, value } = e.target;

    if (name === "paciente_id") {
      const selected = patients.find((patient) => String(patient.id) === value);
      setForm((prev) => ({
        ...prev,
        paciente_id: value,
        paciente: selected?.nombre || "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === "duracion" ? clamp(parseInt(value || "0", 10), 10, 240) : value,
    }));
  };

  const submit = async () => {
    const start = parseDateTime(form.fecha, form.hora);
    await onSave({
      id: initialAppointment?.id,
      paciente_id: form.paciente_id ? Number(form.paciente_id) : null,
      paciente: form.paciente.trim() || "Paciente sin nombre",
      motivo: form.motivo.trim() || "Consulta",
      tipo: form.tipo,
      estado: form.estado,
      start,
      duracion: Number(form.duracion) || 30,
    });
  };

  const cancelAppointment = async () => {
    if (!initialAppointment?.id) return;
    await onCancelAppointment(initialAppointment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className={`w-full ${
          hasQuestionnaire ? "max-w-5xl" : "max-w-2xl"
        } bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 rounded-2xl bg-teal-100 text-teal-600">
              {isEditing ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">
                {isEditing ? "Editar cita" : "Nueva cita"}
              </p>
              <p className="text-xs text-slate-500 font-bold">
                {isEditing ? "Actualiza horario, estado o paciente" : "Registra paciente, hora y motivo"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400"
            aria-label="Cerrar"
            title="Cerrar"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className={`p-6 ${hasQuestionnaire ? "grid grid-cols-1 xl:grid-cols-12 gap-6" : "space-y-5"}`}>
          <div className={hasQuestionnaire ? "xl:col-span-7" : ""}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Paciente registrado</label>
              <select
                name="paciente_id"
                value={form.paciente_id}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              >
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.nombre} ({patient.external_id || `DB-${patient.id}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Nombre mostrado</label>
              <input
                name="paciente"
                value={form.paciente}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                placeholder="Ej: Ana Garcia"
              />
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Motivo</label>
              <input
                name="motivo"
                value={form.motivo}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                placeholder="Ej: Control / Fiebre / Resultados"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Hora</label>
              <input
                type="time"
                name="hora"
                value={form.hora}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              />
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Duracion (min)</label>
              <input
                name="duracion"
                value={form.duracion}
                onChange={update}
                inputMode="numeric"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                placeholder="30"
              />
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              >
                {DEFAULT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Estado</label>
              <select
                name="estado"
                value={form.estado}
                onChange={update}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
              >
                {DEFAULT_STATUS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          </div>

          {hasQuestionnaire ? (
            <div className="xl:col-span-5 rounded-3xl border border-teal-100 bg-teal-50/70 p-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-white text-teal-700 border border-teal-100">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Cuestionario previo</p>
                  <p className="text-xs font-bold text-slate-500">
                    Respondido{" "}
                    {initialAppointment?.cuestionario_actualizado_at
                      ? new Date(initialAppointment.cuestionario_actualizado_at).toLocaleString("es-MX")
                      : "recientemente"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["Motivo de consulta", initialAppointment?.cuestionario_motivo_consulta],
                  ["Sintomas actuales", initialAppointment?.cuestionario_sintomas_actuales],
                  ["Medicamentos actuales", initialAppointment?.cuestionario_medicamentos_actuales],
                  ["Alergias conocidas", initialAppointment?.cuestionario_alergias_conocidas],
                  ["Cambios desde ultima visita", initialAppointment?.cuestionario_cambios_desde_ultima_visita],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white border border-teal-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{label}</p>
                    <p className="mt-2 text-sm font-bold text-slate-700 leading-relaxed">
                      {value || "Sin respuesta registrada."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {isEditing ? (
              <button
                onClick={cancelAppointment}
                disabled={isSaving}
                className="px-6 py-3 rounded-2xl font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <Ban size={16} />
                Cancelar cita
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-700"
              disabled={isSaving}
            >
              Cerrar
            </button>
            <button
              onClick={submit}
              disabled={isSaving}
              className="px-8 py-3 rounded-2xl font-black bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <CheckCircle2 size={18} />
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar cita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgendaView({
  patients = [],
  refreshToken = 0,
  onOpenRecord,
  onStartConsultation,
}) {
  const today = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDT, setModalDT] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const inWeek = selectedDay >= weekStart && selectedDay < addDays(weekStart, 7);
    if (!inWeek) setSelectedDay(weekStart);
  }, [selectedDay, weekStart]);

  const startHour = 8;
  const endHour = 25;
  const slotMinutes = 30;

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push({ h, m: 0 });
      slots.push({ h, m: 30 });
    }
    return slots;
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await apiFetch("/api/citas");
      if (!response.ok) {
        throw new Error(`No se pudo cargar citas (${response.status})`);
      }

      const data = await response.json();
      setAppointments(data.map(normalizeAppointment));
    } catch (loadError) {
      setError(loadError.message || "No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [refreshToken]);

  const openNew = (dt) => {
    setEditingAppointment(null);
    setModalDT(dt ?? new Date());
    setModalOpen(true);
  };

  const openEdit = (appointment) => {
    setEditingAppointment(appointment);
    setModalDT(appointment.start);
    setModalOpen(true);
  };

  const saveAppt = async (appointment) => {
    try {
      setIsSaving(true);
      setError("");

      const payload = {
        paciente_id: appointment.paciente_id,
        paciente_nombre: appointment.paciente,
        motivo: appointment.motivo,
        tipo: appointment.tipo,
        estado: appointment.estado,
        start: appointment.start.toISOString(),
        duracion: appointment.duracion,
      };

      const isEditing = Boolean(appointment.id);
      const response = await apiFetch(isEditing ? `/api/citas/${appointment.id}` : "/api/citas", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`No se pudo ${isEditing ? "actualizar" : "guardar"} la cita (${response.status})`);
      }

      const saved = await response.json();
      const normalized = normalizeAppointment({ ...appointment, ...saved });

      setAppointments((prev) =>
        isEditing
          ? prev.map((item) => (item.id === normalized.id ? normalized : item))
          : [normalized, ...prev]
      );
      setSelectedDay(normalized.start);
      setModalOpen(false);
      setEditingAppointment(null);
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelAppointment = async (appointment) => {
    await saveAppt({
      ...appointment,
      estado: "Cancelado",
    });
  };

  const resolvePatientForAppointment = (appointment) => {
    if (appointment.paciente_id) {
      return patients.find((patient) => patient.id === appointment.paciente_id) || null;
    }

    const normalizedName = String(appointment.paciente || "").trim().toLowerCase();
    if (!normalizedName) return null;

    const matches = patients.filter(
      (patient) => String(patient.nombre || "").trim().toLowerCase() === normalizedName
    );

    return matches.length === 1 ? matches[0] : null;
  };

  const updateAppointmentStatus = async (appointment, estado) => {
    await saveAppt({
      ...appointment,
      estado,
    });
  };

  const openAppointmentRecord = (appointment, consultationId = null) => {
    const resolvedPatient = resolvePatientForAppointment(appointment);
    if (!resolvedPatient || !onOpenRecord) return;

    onOpenRecord(resolvedPatient, { consultationId });
  };

  const startConsultationFromAppointment = (appointment) => {
    const resolvedPatient = resolvePatientForAppointment(appointment);
    if (!resolvedPatient || !onStartConsultation) {
      setError("La cita necesita estar ligada a un paciente existente para iniciar consulta.");
      return;
    }

    onStartConsultation(appointment, resolvedPatient);
  };

  const apptsThisWeek = useMemo(() => {
    const end = addDays(weekStart, 7);
    return appointments.filter((appointment) => appointment.start >= weekStart && appointment.start < end);
  }, [appointments, weekStart]);

  const apptsByDay = useMemo(() => {
    const map = new Map();
    weekDays.forEach((day) => map.set(toISODate(day), []));
    apptsThisWeek.forEach((appointment) => {
      const key = toISODate(appointment.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(appointment);
    });
    map.forEach((items) => items.sort((a, b) => a.start - b.start));
    return map;
  }, [apptsThisWeek, weekDays]);

  const dayList = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments
      .filter((appointment) => sameDay(appointment.start, selectedDay))
      .filter((appointment) => {
        if (!query) return true;
        return (
          String(appointment.paciente || "").toLowerCase().includes(query) ||
          String(appointment.motivo || "").toLowerCase().includes(query) ||
          String(appointment.tipo || "").toLowerCase().includes(query) ||
          String(appointment.estado || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.start - b.start);
  }, [appointments, selectedDay, search]);

  const weekLabel = useMemo(() => fmtMonth(weekStart), [weekStart]);

  const statusPill = (status) => {
    return getStatusAppearance(status).pill;
  };

  const rowHeight = 44;
  const minuteToTop = (minutes) =>
    ((minutes - startHour * 60) / slotMinutes) * rowHeight;

  const openWhatsApp = (appointment, variant) => {
    const url = buildWhatsAppLink(appointment, variant);
    if (!url) {
      setError("No se pudo generar el enlace de WhatsApp para esta cita.");
      return;
    }

    if (typeof window !== "undefined") {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        setError("No se pudo abrir WhatsApp desde esta cita.");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300">
      <div className="xl:col-span-9 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 rounded-2xl bg-teal-100 text-teal-600">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-800">Agenda semanal</p>
              <p className="text-xs text-slate-500 font-bold capitalize">{weekLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAnchor((d) => addDays(d, -7))}
              className="p-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Semana anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => {
                const now = new Date();
                setAnchor(now);
                setSelectedDay(now);
              }}
              className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-100"
            >
              Hoy
            </button>

            <button
              onClick={() => setAnchor((d) => addDays(d, 7))}
              className="p-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Siguiente semana"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={loadAppointments}
              className="p-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Recargar agenda"
            >
              <RotateCw size={18} />
            </button>

            <button
              onClick={() => openNew(new Date())}
              className="ml-2 px-4 py-2 rounded-2xl bg-teal-600 text-white font-black text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Nueva cita
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-6 py-4 text-sm font-bold text-red-600 bg-red-50 border-b border-red-100">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="p-8 text-sm font-bold text-slate-500">Cargando agenda...</div>
        ) : (
          <div className="border-t border-slate-100">
            <div className="px-6 py-3 text-[11px] font-bold text-slate-400 xl:hidden">
              Desliza horizontalmente para ver toda la semana.
            </div>

            <div className="max-h-[72vh] overflow-auto">
              <div className="min-w-[1024px]">
                <div className="grid grid-cols-8 border-b border-slate-100 sticky top-0 z-20 bg-white">
                  <div className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[92px]">
                    Hora
                  </div>

                  {weekDays.map((day) => {
                    const isToday = sameDay(day, today);
                    const isSelected = sameDay(day, selectedDay);

                    const dayBubbleClass = isToday
                      ? "bg-teal-600 text-white"
                      : isSelected
                      ? "bg-white text-teal-600 ring-2 ring-teal-600"
                      : "bg-slate-100 text-slate-700";

                    return (
                      <button
                        key={toISODate(day)}
                        onClick={() => setSelectedDay(day)}
                        className={`p-4 text-left border-l border-slate-100 hover:bg-slate-50 transition-colors ${
                          isSelected ? "bg-teal-50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-[10px] font-black uppercase tracking-widest ${
                              isToday ? "text-teal-600" : "text-slate-400"
                            }`}
                          >
                            {fmtDayShort(day)}
                          </p>

                          <div
                            className={`w-7 h-7 rounded-2xl flex items-center justify-center font-black text-sm ${dayBubbleClass}`}
                          >
                            {fmtDayNumber(day)}
                          </div>
                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {(apptsByDay.get(toISODate(day)) ?? []).length} citas
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-8">
                  <div className="border-r border-slate-100 w-[92px]">
                    {timeSlots.map((slot, idx) => {
                      const label = slot.m === 0 ? `${pad2(slot.h)}:00` : "";
                      return (
                        <div
                          key={idx}
                          className="h-[44px] px-4 flex items-center justify-start text-xs font-black text-slate-400 overflow-hidden"
                        >
                          <span className="whitespace-nowrap">{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {weekDays.map((day) => (
                    <div key={toISODate(day)} className="relative border-r border-slate-100">
                      {timeSlots.map((slot, idx) => {
                        const dt = new Date(day);
                        dt.setHours(slot.h, slot.m, 0, 0);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openNew(dt)}
                            className="w-full h-[44px] border-b border-slate-100 hover:bg-slate-50 transition-colors"
                            aria-label={`Crear cita ${toISODate(day)} ${pad2(slot.h)}:${pad2(slot.m)}`}
                            title="Click para crear cita aqui"
                          />
                        );
                      })}

                      {(apptsByDay.get(toISODate(day)) ?? []).map((appointment) => {
                        const top = minuteToTop(minutesFromMidnight(appointment.start));
                        const height = (appointment.duracion / slotMinutes) * rowHeight;
                        const appearance = getStatusAppearance(appointment.estado);

                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => openEdit(appointment)}
                            className="absolute left-2 right-2 text-left"
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(72, height)}px`,
                            }}
                          >
                            <div
                              className={`h-full rounded-[22px] border ${appearance.card} p-3 flex flex-col justify-between shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden`}
                            >
                              <div className={`absolute inset-y-0 left-0 w-1.5 ${appearance.accentBar}`} />

                              <div className="min-w-0 pl-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[12px] font-black text-slate-800 truncate">
                                    {appointment.paciente}
                                  </p>
                                  {appointment.cuestionario_id ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-teal-700 border border-teal-100">
                                      <ClipboardCheck size={10} />
                                      Cuest.
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-[11px] font-bold text-slate-500 truncate">
                                  {appointment.motivo || "Consulta"}
                                </p>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 truncate">
                                    {appointment.tipo || "Cita"}
                                  </p>
                                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${appearance.pill}`}>
                                    <span
                                      className={`h-2 w-2 rounded-full ${appearance.accentBar}`}
                                      aria-hidden="true"
                                    />
                                    {statusLabel(appointment.estado)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-black text-slate-600 pl-2">
                                <span className="flex items-center gap-1.5">
                                  <Clock size={11} />
                                  {pad2(appointment.start.getHours())}:{pad2(appointment.start.getMinutes())}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Timer size={11} />
                                  {appointment.duracion}m
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-purple-100 text-purple-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">Citas del dia</p>
              <p className="text-xs text-slate-500 font-bold">
                {selectedDay.toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>

          <div className="mt-5 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold text-slate-700"
              placeholder="Buscar paciente / motivo..."
            />
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                Cargando citas...
              </div>
            ) : dayList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                No hay citas para este dia.
              </div>
            ) : (
              dayList.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => openEdit(appointment)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEdit(appointment);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  {(() => {
                    const appearance = getStatusAppearance(appointment.estado);
                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-800 truncate">{appointment.paciente}</p>
                        {appointment.cuestionario_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-700 border border-teal-100">
                            <ClipboardCheck size={12} />
                            Cuestionario
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 font-bold truncate">
                        {appointment.motivo} | {appointment.tipo}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full ${statusPill(
                        appointment.estado
                      )}`}
                    >
                      {statusLabel(appointment.estado)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {pad2(appointment.start.getHours())}:{pad2(appointment.start.getMinutes())}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer size={14} />
                      {appointment.duracion} min
                    </span>
                  </div>

                  {appointment.consulta_id ? (
                    <div className="mt-3 rounded-2xl bg-teal-50 border border-teal-100 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">
                        Consulta ligada
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {appointment.consulta_cie10_codigo
                          ? `${appointment.consulta_cie10_codigo} - ${
                              appointment.consulta_cie10_descripcion || appointment.consulta_diagnostico || "Sin diagnostico"
                            }`
                          : appointment.consulta_diagnostico || "Consulta registrada"}
                      </p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAppointmentRecord(appointment, appointment.consulta_id);
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-teal-700 border border-teal-100 hover:bg-teal-100 transition-colors"
                      >
                        <ClipboardCheck size={14} />
                        Ver nota
                      </button>
                    </div>
                  ) : null}

                  {appointment.cuestionario_id ? (
                    <div className="mt-3 rounded-2xl bg-white border border-teal-100 px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">
                        Cuestionario previo respondido
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-600 line-clamp-2">
                        {appointment.cuestionario_motivo_consulta ||
                          appointment.cuestionario_sintomas_actuales ||
                          "Respuestas disponibles al abrir detalle."}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateAppointmentStatus(appointment, "En consulta");
                      }}
                      disabled={isSaving || appointment.estado === "En consulta" || appointment.estado === "Completado"}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
                    >
                      <UserCheck size={14} />
                      Llego
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateAppointmentStatus(appointment, "No asistio");
                      }}
                      disabled={isSaving || appointment.estado === "No asistio" || appointment.estado === "Completado"}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <CircleOff size={14} />
                      No se presento
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startConsultationFromAppointment(appointment);
                      }}
                      disabled={isSaving || Boolean(appointment.consulta_id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-teal-100 hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      <Stethoscope size={14} />
                      Iniciar consulta
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openAppointmentRecord(appointment);
                      }}
                      disabled={!resolvePatientForAppointment(appointment)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:border-teal-200 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    >
                      <FileText size={14} />
                      Ver expediente
                    </button>
                  </div>

                  {appointment.estado === "Confirmado" && appointment.portal_token ? (
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openWhatsApp(appointment, "confirmacion");
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <MessageCircle size={14} />
                        Enviar confirmacion por WhatsApp
                      </button>

                      {isWithinNext24Hours(appointment.start) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openWhatsApp(appointment, "recordatorio");
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                          <BellRing size={14} />
                          Enviar recordatorio
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Indice de colores
            </p>
            <div className="mt-3 space-y-2">
              {DEFAULT_STATUS.map((status) => {
                const appearance = getStatusAppearance(status);
                return (
                  <div
                    key={status}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${appearance.legend}`}
                  >
                    <span
                      className={`h-10 w-10 shrink-0 rounded-xl ${appearance.accentBar} shadow-sm ring-1 ring-white/70`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-none">{statusLabel(status)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => openNew(new Date(selectedDay))}
            className="mt-5 w-full px-4 py-3 rounded-2xl bg-teal-600 text-white font-black shadow-lg shadow-teal-100 hover:bg-teal-700 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Crear cita en este dia
          </button>
        </div>
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAppointment(null);
        }}
        onSave={saveAppt}
        onCancelAppointment={cancelAppointment}
        initialDateTime={modalDT}
        initialAppointment={editingAppointment}
        isSaving={isSaving}
        patients={patients}
      />
    </div>
  );
}
