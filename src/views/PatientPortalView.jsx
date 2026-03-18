import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileText,
  HeartPulse,
  Pill,
  Stethoscope,
  Wallet,
  ChevronDown,
  ChevronUp,
  CircleOff,
  Send,
} from "lucide-react";

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateAge = (birthDateValue) => {
  if (!birthDateValue) return null;
  const normalizedValue = String(birthDateValue);
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const birthDate = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(birthDateValue);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const statusStyles = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "En espera": "bg-amber-50 text-amber-700 border-amber-100",
  "En consulta": "bg-teal-50 text-teal-700 border-teal-100",
  Cancelado: "bg-red-50 text-red-700 border-red-100",
  Completado: "bg-slate-100 text-slate-700 border-slate-200",
  "No asistio": "bg-slate-100 text-slate-600 border-slate-200",
};

const questionnaireInitialState = {
  motivo_consulta: "",
  sintomas_actuales: "",
  medicamentos_actuales: "",
  alergias_conocidas: "",
  cambios_desde_ultima_visita: "",
};

export default function PatientPortalView({ token }) {
  const [portalData, setPortalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedConsultationId, setExpandedConsultationId] = useState(null);
  const [isSubmittingQuestionnaire, setIsSubmittingQuestionnaire] = useState(false);
  const [isCancellingAppointmentId, setIsCancellingAppointmentId] = useState(null);
  const [questionnaireForm, setQuestionnaireForm] = useState(questionnaireInitialState);
  const [feedback, setFeedback] = useState("");

  const loadPortal = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`/api/portal/${token}`);
      if (!response.ok) {
        throw new Error(`No se pudo cargar tu portal (${response.status})`);
      }
      const data = await response.json();
      setPortalData(data);
      setExpandedConsultationId(null);
      setQuestionnaireForm(
        data.cuestionario_previo?.respuestas
          ? {
              ...questionnaireInitialState,
              ...data.cuestionario_previo.respuestas,
            }
          : questionnaireInitialState
      );
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar tu portal");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, [token]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const upcomingAppointments = useMemo(
    () =>
      (portalData?.citas || [])
        .filter((appointment) => {
          const start = new Date(appointment.start);
          return !Number.isNaN(start.getTime()) && start >= new Date();
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start)),
    [portalData]
  );

  const submitQuestionnaire = async () => {
    if (!portalData?.cuestionario_previo?.cita_id) return;

    try {
      setIsSubmittingQuestionnaire(true);
      setError("");
      const response = await fetch(`/api/portal/${token}/cuestionarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cita_id: portalData.cuestionario_previo.cita_id,
          ...questionnaireForm,
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo enviar el cuestionario (${response.status})`);
      }

      setFeedback("Cuestionario enviado correctamente");
      await loadPortal();
    } catch (submitError) {
      setError(submitError.message || "No se pudo enviar el cuestionario");
    } finally {
      setIsSubmittingQuestionnaire(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      setIsCancellingAppointmentId(appointmentId);
      setError("");
      const response = await fetch(`/api/portal/${token}/citas/${appointmentId}/cancelar`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`No se pudo cancelar la cita (${response.status})`);
      }

      setFeedback("Cita cancelada correctamente");
      await loadPortal();
    } catch (cancelError) {
      setError(cancelError.message || "No se pudo cancelar la cita");
    } finally {
      setIsCancellingAppointmentId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_100%)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-teal-100 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-black text-teal-700">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  if (error && !portalData) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_100%)] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-lg font-black text-slate-800">No se pudo abrir tu portal</p>
          <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const patient = portalData?.paciente;
  const resolvedAge = patient?.edad ?? calculateAge(patient?.fecha_nacimiento);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_48%,#ffffff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-[28px] border border-teal-100 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(13,148,136,0.45)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-500">Portal del paciente</p>
              <h1 className="mt-2 text-3xl font-black text-slate-800">{patient?.nombre}</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Expediente {patient?.external_id || `DB-${patient?.id}`} • {patient?.sexo || "Sexo N/D"} •{" "}
                {resolvedAge ?? "Edad N/D"} años
              </p>
            </div>
            <div className="rounded-3xl bg-teal-50 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase text-teal-500">Ultima visita</p>
              <p className="text-sm font-black text-teal-700">{formatDate(patient?.ultima_visita)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Telefono</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{patient?.telefono || "Sin registro"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Email</p>
              <p className="mt-1 text-sm font-bold text-slate-700 break-all">{patient?.email || "Sin registro"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Alergias</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{patient?.alergias_resumen || "Sin registro"}</p>
            </div>
          </div>
        </section>

        {feedback ? (
          <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
            <p className="text-sm font-bold text-teal-700">{feedback}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Mis citas</h2>
              <p className="text-sm font-bold text-slate-500">Tus proximas visitas y su estado</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingAppointments.length ? (
              upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-black ${
                            statusStyles[appointment.estado] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {appointment.estado}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
                          <Clock3 size={13} />
                          {formatDateTime(appointment.start)}
                        </span>
                      </div>
                      <p className="text-base font-black text-slate-800">{appointment.motivo || "Consulta"}</p>
                      <p className="text-sm font-bold text-slate-500">
                        {appointment.tipo || "Consulta general"} • {appointment.duracion || 30} min
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => cancelAppointment(appointment.id)}
                      disabled={
                        isCancellingAppointmentId === appointment.id ||
                        ["Cancelado", "Completado", "No asistio"].includes(appointment.estado)
                      }
                      className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCancellingAppointmentId === appointment.id ? "Cancelando..." : "Cancelar cita"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5">
                <p className="text-sm font-bold text-slate-500">No tienes citas proximas registradas.</p>
              </div>
            )}
          </div>
        </section>

        {portalData?.cuestionario_previo?.visible ? (
          <section className="rounded-[28px] border border-teal-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <HeartPulse size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Cuestionario previo</h2>
                <p className="text-sm font-bold text-slate-500">
                  Ayudanos a preparar tu cita del {formatDateTime(portalData.cuestionario_previo.fecha_cita)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <textarea
                value={questionnaireForm.motivo_consulta}
                onChange={(e) =>
                  setQuestionnaireForm((prev) => ({ ...prev, motivo_consulta: e.target.value }))
                }
                className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Motivo de consulta"
              />
              <textarea
                value={questionnaireForm.sintomas_actuales}
                onChange={(e) =>
                  setQuestionnaireForm((prev) => ({ ...prev, sintomas_actuales: e.target.value }))
                }
                className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Sintomas actuales"
              />
              <textarea
                value={questionnaireForm.medicamentos_actuales}
                onChange={(e) =>
                  setQuestionnaireForm((prev) => ({ ...prev, medicamentos_actuales: e.target.value }))
                }
                className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Medicamentos que tomas actualmente"
              />
              <textarea
                value={questionnaireForm.alergias_conocidas}
                onChange={(e) =>
                  setQuestionnaireForm((prev) => ({ ...prev, alergias_conocidas: e.target.value }))
                }
                className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Alergias conocidas"
              />
              <textarea
                value={questionnaireForm.cambios_desde_ultima_visita}
                onChange={(e) =>
                  setQuestionnaireForm((prev) => ({
                    ...prev,
                    cambios_desde_ultima_visita: e.target.value,
                  }))
                }
                className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Cambios desde tu ultima visita"
              />
            </div>

            <button
              type="button"
              onClick={submitQuestionnaire}
              disabled={isSubmittingQuestionnaire}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700 disabled:opacity-60"
            >
              <Send size={16} />
              {isSubmittingQuestionnaire ? "Enviando..." : "Enviar cuestionario"}
            </button>
          </section>
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Mis consultas</h2>
              <p className="text-sm font-bold text-slate-500">Historial clinico y recetas disponibles</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(portalData?.consultas || []).length ? (
              portalData.consultas.map((consultation) => {
                const expanded = expandedConsultationId === consultation.id;
                const diagnosis = consultation.cie10_codigo
                  ? `${consultation.cie10_codigo} - ${
                      consultation.cie10_descripcion || consultation.diagnostico || "Sin diagnostico"
                    }`
                  : consultation.diagnostico || "Sin diagnostico";

                return (
                  <div key={consultation.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedConsultationId((prev) => (prev === consultation.id ? null : consultation.id))
                      }
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800">{formatDateTime(consultation.fecha)}</p>
                        <p className="text-sm font-bold text-teal-700">{diagnosis}</p>
                        <p className="text-xs font-bold text-slate-500">
                          Medico: {consultation.medico_nombre || "Sin medico"}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-white p-2 text-slate-500 shadow-sm">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {expanded ? (
                      <div className="space-y-4 border-t border-slate-200 bg-white px-4 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-700">
                              <Stethoscope size={16} className="text-teal-600" />
                              <p className="text-sm font-black">Diagnostico CIE-10</p>
                            </div>
                            <p className="text-sm font-bold text-slate-600">{diagnosis}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <div className="mb-2 flex items-center gap-2 text-slate-700">
                              <HeartPulse size={16} className="text-teal-600" />
                              <p className="text-sm font-black">Signos vitales</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                              <span>Peso: {consultation.signos?.peso || "N/D"}</span>
                              <span>Tension arterial (TA): {consultation.signos?.ta || "N/D"}</span>
                              <span>Temperatura (Temp): {consultation.signos?.temp || "N/D"}</span>
                              <span>Glucosa: {consultation.signos?.glucosa || "N/D"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-700">Plan de tratamiento</p>
                          <p className="mt-2 text-sm font-bold text-slate-600">
                            {consultation.plan_tratamiento || "Sin plan registrado"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="mb-3 flex items-center gap-2 text-slate-700">
                            <Pill size={16} className="text-teal-600" />
                            <p className="text-sm font-black">Medicamentos indicados</p>
                          </div>

                          {(consultation.recetas || []).length ? (
                            <div className="space-y-3">
                              {consultation.recetas.map((item) => (
                                <div
                                  key={item.id || `${consultation.id}-${item.medicamento}`}
                                  className="rounded-2xl border border-slate-200 bg-white p-3"
                                >
                                  <p className="text-sm font-black text-slate-800">
                                    {item.medicamento || "Medicamento sin nombre"}
                                  </p>
                                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs font-bold text-slate-500 sm:grid-cols-2">
                                    <span>Dosis: {item.dosis || "Sin dosis"}</span>
                                    <span>Via: {item.via_administracion || "Sin via especificada"}</span>
                                    <span>
                                      Frecuencia:{" "}
                                      {item.frecuencia_cantidad
                                        ? `Cada ${item.frecuencia_cantidad} ${item.frecuencia_unidad || ""}`
                                        : "Sin frecuencia"}
                                    </span>
                                    <span>
                                      Duracion:{" "}
                                      {item.duracion_cantidad
                                        ? `${item.duracion_cantidad} ${item.duracion_unidad || ""}`
                                        : "Sin duracion"}
                                    </span>
                                    <span>
                                      Indicaciones: {item.indicaciones || "Sin indicaciones"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-500">
                              No hay medicamentos registrados en esta consulta.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-5">
                <p className="text-sm font-bold text-slate-500">Todavia no tienes consultas registradas.</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Pagar</h2>
              <p className="text-sm font-bold text-slate-500">Saldo de tus citas y pagos</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Saldo pendiente</p>
              <p className="mt-1 text-3xl font-black text-slate-800">
                ${Number(portalData?.pagos?.saldo_pendiente || 0).toFixed(2)}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {(portalData?.pagos?.pendientes || []).length
                  ? `${portalData.pagos.pendientes.length} cargo(s) pendiente(s)`
                  : "No hay pagos pendientes por ahora"}
              </p>
            </div>

            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-400"
            >
              <CircleOff size={16} />
              Pagar consulta • Proximamente
            </button>
          </div>
        </section>

        <div className="pb-4 text-center">
          <p className="text-xs font-bold text-slate-400">MyCliniq • Portal del paciente</p>
        </div>
      </div>
    </div>
  );
}
