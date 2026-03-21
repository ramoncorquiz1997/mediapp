import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  EyeOff,
  Mail,
  Plus,
  Save,
  SearchCheck,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

const defaultOwnerLogin = {
  email: "",
  password: "",
};

const defaultDoctorForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "medico",
  cedula_profesional: "",
  slug: "",
};

const defaultSmtpForm = {
  smtp_host: "",
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  leads_notify_email: "",
  smtp_password_configured: false,
};

const leadStatusOptions = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "demo_agendada", label: "Demo agendada" },
  { value: "cerrado", label: "Cerrado" },
];

const verificationStatusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
];

const subscriptionStatusOptions = [
  { value: "not_started", label: "Sin iniciar" },
  { value: "trialing", label: "Trial" },
  { value: "active", label: "Activa" },
  { value: "past_due", label: "Pago vencido" },
  { value: "canceled", label: "Cancelada" },
  { value: "unpaid", label: "Impaga" },
  { value: "incomplete", label: "Incompleta" },
];

const accessStatusOptions = [
  { value: "pending_onboarding", label: "Onboarding" },
  { value: "pending_verification", label: "Por verificar" },
  { value: "pending_payment", label: "Pendiente de pago" },
  { value: "active", label: "Activo" },
  { value: "limited", label: "Limitado" },
  { value: "suspended", label: "Suspendido" },
  { value: "blocked", label: "Bloqueado" },
];

const billingCycleOptions = [
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

const paymentStatusOptions = [
  { value: "", label: "Sin registro" },
  { value: "paid", label: "Pagado" },
  { value: "pending", label: "Pendiente" },
  { value: "failed", label: "Fallido" },
  { value: "refunded", label: "Reembolsado" },
  { value: "waived", label: "Bonificado" },
  { value: "offline", label: "Offline" },
];

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const normalizedValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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

const createDoctorDraft = (doctor) => ({
  nombre: doctor.nombre || "",
  email: doctor.email || "",
  slug: doctor.slug || "",
  rol: doctor.rol || "medico",
  cedula_profesional: doctor.cedula_profesional || "",
  activo: Boolean(doctor.activo),
  verification_status: doctor.verification_status || "pending",
  verification_notes: doctor.verification_notes || "",
  subscription_status: doctor.subscription_status || "not_started",
  billing_plan_code: doctor.billing_plan_code || "",
  billing_cycle: doctor.billing_cycle || "monthly",
  billing_amount: doctor.billing_amount ?? "",
  billing_currency: doctor.billing_currency || "MXN",
  stripe_customer_id: doctor.stripe_customer_id || "",
  stripe_subscription_id: doctor.stripe_subscription_id || "",
  billing_current_period_start: toDateTimeLocal(doctor.billing_current_period_start),
  billing_current_period_end: toDateTimeLocal(doctor.billing_current_period_end),
  billing_trial_ends_at: toDateTimeLocal(doctor.billing_trial_ends_at),
  billing_last_payment_at: toDateTimeLocal(doctor.billing_last_payment_at),
  billing_last_payment_status: doctor.billing_last_payment_status || "",
  billing_cancel_at_period_end: Boolean(doctor.billing_cancel_at_period_end),
  manual_access_until: toDateTimeLocal(doctor.manual_access_until),
  manual_billing_override: Boolean(doctor.manual_billing_override),
  manual_override_reason: doctor.manual_override_reason || "",
  access_status: doctor.access_status || "pending_payment",
  saas_notes: doctor.saas_notes || "",
});

export default function OwnerConsolePage({
  owner,
  isReady,
  isLoggingIn,
  authError,
  doctors,
  doctorsLoading,
  leads,
  leadsLoading,
  updatingLeadId,
  updatingDoctorId,
  ownerConfig,
  configLoading,
  onLogin,
  onLogout,
  onCreateDoctor,
  onValidateDoctorLicense,
  isCreatingDoctor,
  isValidatingDoctorLicense,
  createDoctorError,
  doctorSuccessMessage,
  onSaveConfig,
  isSavingConfig,
  configError,
  configSuccessMessage,
  onUpdateLead,
  onUpdateDoctor,
}) {
  const [loginForm, setLoginForm] = useState(defaultOwnerLogin);
  const [doctorForm, setDoctorForm] = useState(defaultDoctorForm);
  const [smtpForm, setSmtpForm] = useState(defaultSmtpForm);
  const [leadDrafts, setLeadDrafts] = useState({});
  const [doctorDrafts, setDoctorDrafts] = useState({});
  const [expandedDoctorIds, setExpandedDoctorIds] = useState({});
  const [doctorLicenseValidation, setDoctorLicenseValidation] = useState(null);
  const [doctorLicenseMessage, setDoctorLicenseMessage] = useState("");

  useEffect(() => {
    setSmtpForm((prev) => ({
      ...prev,
      ...ownerConfig,
      smtp_password: "",
    }));
  }, [ownerConfig]);

  useEffect(() => {
    setLeadDrafts(
      Object.fromEntries(
        (leads || []).map((lead) => [
          lead.id,
          {
            estado: lead.estado || "nuevo",
            notas: lead.notas || "",
          },
        ])
      )
    );
  }, [leads]);

  useEffect(() => {
    setDoctorDrafts(
      Object.fromEntries((doctors || []).map((doctor) => [doctor.id, createDoctorDraft(doctor)]))
    );
  }, [doctors]);

  const submitLogin = async (e) => {
    e.preventDefault();
    await onLogin(loginForm);
  };

  const submitDoctor = async (e) => {
    e.preventDefault();

    if (!doctorLicenseValidation?.valid || !doctorLicenseValidation?.isMedicalDoctor) {
      setDoctorLicenseMessage("Primero valida una cedula medica permitida antes de crear al medico.");
      return;
    }

    if (String(doctorLicenseValidation.cedula || "") !== String(doctorForm.cedula_profesional || "").trim()) {
      setDoctorLicenseMessage("La cedula validada ya no coincide con la capturada. Vuelve a validarla.");
      return;
    }

    const created = await onCreateDoctor(doctorForm);
    if (created) {
      setDoctorForm(defaultDoctorForm);
      setDoctorLicenseValidation(null);
      setDoctorLicenseMessage("");
    }
  };

  const validateDoctorLicense = async () => {
    const result = await onValidateDoctorLicense(doctorForm.cedula_profesional);
    if (!result) return;

    setDoctorLicenseValidation(result);
    setDoctorLicenseMessage(result.message || "");
    setDoctorForm((prev) => ({
      ...prev,
      cedula_profesional: result.cedula || prev.cedula_profesional,
      nombre: result.fullName || prev.nombre,
    }));
  };

  const submitConfig = async (e) => {
    e.preventDefault();
    await onSaveConfig(smtpForm);
    setSmtpForm((prev) => ({ ...prev, smtp_password: "" }));
  };

  const saveLead = async (leadId) => {
    const draft = leadDrafts[leadId];
    if (!draft) return;
    await onUpdateLead(leadId, draft);
  };

  const saveDoctor = async (doctorId) => {
    const draft = doctorDrafts[doctorId];
    if (!draft) return;
    await onUpdateDoctor(doctorId, draft);
  };

  const handleDoctorCedulaChange = (value) => {
    setDoctorForm((prev) => ({ ...prev, cedula_profesional: value.replace(/\D/g, "").slice(0, 8) }));
    setDoctorLicenseValidation(null);
    setDoctorLicenseMessage("");
  };

  const toggleDoctorExpanded = (doctorId) => {
    setExpandedDoctorIds((prev) => ({
      ...prev,
      [doctorId]: !prev[doctorId],
    }));
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm font-black text-slate-300">Preparando consola owner...</p>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#111827_0%,#0f172a_52%,#020617_100%)] p-6 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
            <EyeOff size={14} />
            <span>Consola privada owner</span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-200">
              <Shield size={26} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Acceso oculto</h1>
              <p className="text-sm font-bold text-slate-400">Solo para administracion del SaaS</p>
            </div>
          </div>

          <form onSubmit={submitLogin} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Correo owner</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Password owner</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
                autoComplete="current-password"
              />
            </div>

            {authError ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
            >
              {isLoggingIn ? "Entrando..." : "Entrar a consola owner"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600">Consola owner</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Administracion del SaaS</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Sesion activa como {owner.nombre} • {owner.email}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cerrar sesion owner
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">SMTP y leads</h2>
                <p className="text-sm font-bold text-slate-500">Configura el correo que recibira las solicitudes de demo.</p>
              </div>
            </div>

            <form onSubmit={submitConfig} className="mt-6 space-y-4">
              {configError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {configError}
                </div>
              ) : null}

              {configSuccessMessage ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {configSuccessMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">SMTP host</span>
                  <input
                    value={smtpForm.smtp_host || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_host: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="smtp.gmail.com"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">SMTP port</span>
                  <input
                    type="number"
                    value={smtpForm.smtp_port || 587}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_port: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Usuario SMTP</span>
                  <input
                    value={smtpForm.smtp_user || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_user: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="tucorreo@gmail.com"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Password SMTP</span>
                  <input
                    type="password"
                    value={smtpForm.smtp_password || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_password: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={smtpForm.smtp_password_configured ? "Dejar vacio para conservar actual" : "Nueva password SMTP"}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Correo remitente</span>
                  <input
                    type="email"
                    value={smtpForm.smtp_from_email || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_from_email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="noreply@mycliniq.lat"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Correo receptor de leads</span>
                  <input
                    type="email"
                    value={smtpForm.leads_notify_email || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, leads_notify_email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="ventas@mycliniq.lat"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(smtpForm.smtp_secure)}
                  onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_secure: e.target.checked }))}
                />
                Usar conexion segura SMTPS
              </label>

              <button
                type="submit"
                disabled={isSavingConfig || configLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-cyan-700 disabled:opacity-60"
              >
                <Save size={16} />
                <span>{isSavingConfig ? "Guardando..." : "Guardar SMTP"}</span>
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Crear medico</h2>
                  <p className="text-sm font-bold text-slate-500">Alta manual con password inicial.</p>
                </div>
              </div>

              <form onSubmit={submitDoctor} className="mt-6 space-y-4">
                {createDoctorError ? (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {createDoctorError}
                  </div>
                ) : null}

                {doctorSuccessMessage ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {doctorSuccessMessage}
                  </div>
                ) : null}

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Nombre</span>
                  <input
                    value={doctorForm.nombre}
                    onChange={(e) => setDoctorForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Correo</span>
                  <input
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500">Password inicial</span>
                    <input
                      type="password"
                      value={doctorForm.password}
                      onChange={(e) => setDoctorForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500">Rol</span>
                    <select
                      value={doctorForm.rol}
                      onChange={(e) => setDoctorForm((prev) => ({ ...prev, rol: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="medico">Medico</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500">Cedula profesional</span>
                    <input
                      value={doctorForm.cedula_profesional}
                      onChange={(e) => handleDoctorCedulaChange(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={validateDoctorLicense}
                    disabled={isValidatingDoctorLicense || doctorForm.cedula_profesional.trim().length < 7}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-black text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60"
                  >
                    <SearchCheck size={16} />
                    <span>{isValidatingDoctorLicense ? "Validando..." : "Validar cedula"}</span>
                  </button>
                </div>

                {doctorLicenseMessage ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      doctorLicenseValidation?.valid
                        ? doctorLicenseValidation?.isMedicalDoctor
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                        : "border-red-100 bg-red-50 text-red-600"
                    }`}
                  >
                    <p>{doctorLicenseMessage}</p>
                    {doctorLicenseValidation?.valid ? (
                      <div className="mt-3 flex items-start gap-3">
                        <div
                          className={`rounded-2xl p-2 ${
                            doctorLicenseValidation.isMedicalDoctor
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <BadgeCheck size={18} />
                        </div>
                        <div className="space-y-1 text-sm font-bold text-slate-600">
                          <p className="text-slate-900">{doctorLicenseValidation.fullName || "Sin nombre SEP"}</p>
                          <p>{doctorLicenseValidation.profession || "Profesion no disponible"}</p>
                          <p>
                            {doctorLicenseValidation.institution || "Institucion no disponible"}
                            {doctorLicenseValidation.institutionState
                              ? ` • ${doctorLicenseValidation.institutionState}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Slug opcional</span>
                  <input
                    value={doctorForm.slug}
                    onChange={(e) => setDoctorForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    isCreatingDoctor ||
                    isValidatingDoctorLicense ||
                    !doctorLicenseValidation?.valid ||
                    !doctorLicenseValidation?.isMedicalDoctor ||
                    String(doctorLicenseValidation?.cedula || "") !== String(doctorForm.cedula_profesional || "").trim()
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                >
                  <Plus size={16} />
                  <span>{isCreatingDoctor ? "Creando..." : "Crear medico"}</span>
                </button>
              </form>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                  <Mail size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Leads recibidos</h2>
                  <p className="text-sm font-bold text-slate-500">Solicitudes de demo guardadas aunque falle el correo.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {leadsLoading ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Cargando leads...
                  </div>
                ) : leads.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Aun no hay leads registrados.
                  </div>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800">{lead.nombre}</p>
                            <p className="mt-1 break-all text-xs font-bold text-slate-500">
                              {lead.email} • {lead.telefono || "Sin telefono"} • {lead.especialidad || "Sin especialidad"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-[11px] font-black text-slate-500">
                            {formatDateTime(lead.fecha || lead.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto]">
                          <select
                            value={leadDrafts[lead.id]?.estado || "nuevo"}
                            onChange={(e) =>
                              setLeadDrafts((prev) => ({
                                ...prev,
                                [lead.id]: {
                                  ...(prev[lead.id] || {}),
                                  estado: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            {leadStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <input
                            value={leadDrafts[lead.id]?.notas || ""}
                            onChange={(e) =>
                              setLeadDrafts((prev) => ({
                                ...prev,
                                [lead.id]: {
                                  ...(prev[lead.id] || {}),
                                  notas: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Notas internas"
                          />

                          <button
                            type="button"
                            onClick={() => saveLead(lead.id)}
                            disabled={updatingLeadId === lead.id}
                            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
                          >
                            {updatingLeadId === lead.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Medicos registrados</h2>
                <p className="text-sm font-bold text-slate-500">
                  Panel completo para verificar credenciales, suscripcion y acceso del SaaS.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">
              <CreditCard size={16} />
              <span>Aqui ya puedes manejar vencimiento, acceso y datos de Stripe manualmente</span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {doctorsLoading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                Cargando medicos...
              </div>
            ) : doctors.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                Aun no hay medicos registrados.
              </div>
            ) : (
              doctors.map((doctor) => {
                const draft = doctorDrafts[doctor.id] || createDoctorDraft(doctor);
                const isSavingDoctor = updatingDoctorId === doctor.id;
                const isExpanded = Boolean(expandedDoctorIds[doctor.id]);

                return (
                  <div key={doctor.id} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <button
                      type="button"
                      onClick={() => toggleDoctorExpanded(doctor.id)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <div>
                        <p className="text-lg font-black text-slate-900">{doctor.nombre}</p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {doctor.email} • {doctor.rol} • {doctor.cedula_profesional || "Sin cedula"}
                        </p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                          Acceso efectivo: {doctor.access_summary?.effective_status || "sin calcular"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {doctor.access_summary?.reason || "Sin resumen operativo"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-600">
                          Alta: {formatDateTime(doctor.created_at)}
                        </div>
                        <div className="rounded-2xl border border-white bg-white p-3 text-slate-600">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-black text-slate-900">Cuenta</p>

                        <label className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Nombre</span>
                          <input
                            value={draft.nombre}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, nombre: e.target.value },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Correo</span>
                          <input
                            type="email"
                            value={draft.email}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, email: e.target.value },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Slug</span>
                            <input
                              value={draft.slug}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, slug: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Cedula</span>
                            <input
                              value={draft.cedula_profesional}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, cedula_profesional: e.target.value.replace(/\D/g, "").slice(0, 8) },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>
                        </div>

                        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.activo)}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, activo: e.target.checked },
                              }))
                            }
                          />
                          Cuenta habilitada
                        </label>
                        </div>

                        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-black text-slate-900">Verificacion y acceso</p>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Verificacion</span>
                            <select
                              value={draft.verification_status}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, verification_status: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              {verificationStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Acceso</span>
                            <select
                              value={draft.access_status}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, access_status: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              {accessStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Notas de verificacion</span>
                          <textarea
                            value={draft.verification_notes}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, verification_notes: e.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Acceso manual hasta</span>
                            <input
                              type="datetime-local"
                              value={draft.manual_access_until}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, manual_access_until: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Motivo override</span>
                            <input
                              value={draft.manual_override_reason}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, manual_override_reason: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                              placeholder="Cortesia, validacion manual, soporte..."
                            />
                          </label>
                        </div>

                        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.manual_billing_override)}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, manual_billing_override: e.target.checked },
                              }))
                            }
                          />
                          Override manual habilitado
                        </label>
                        </div>

                        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-black text-slate-900">Facturacion</p>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Suscripcion</span>
                            <select
                              value={draft.subscription_status}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, subscription_status: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              {subscriptionStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Ultimo pago</span>
                            <select
                              value={draft.billing_last_payment_status}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_last_payment_status: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              {paymentStatusOptions.map((option) => (
                                <option key={option.value || "empty"} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Plan</span>
                            <input
                              value={draft.billing_plan_code}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_plan_code: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                              placeholder="pro-mensual"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Monto</span>
                            <input
                              type="number"
                              step="0.01"
                              value={draft.billing_amount}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_amount: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Ciclo</span>
                            <select
                              value={draft.billing_cycle}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_cycle: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              {billingCycleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Inicio de periodo</span>
                            <input
                              type="datetime-local"
                              value={draft.billing_current_period_start}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_current_period_start: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Fin de periodo</span>
                            <input
                              type="datetime-local"
                              value={draft.billing_current_period_end}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_current_period_end: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Trial hasta</span>
                            <input
                              type="datetime-local"
                              value={draft.billing_trial_ends_at}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_trial_ends_at: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Fecha ultimo pago</span>
                            <input
                              type="datetime-local"
                              value={draft.billing_last_payment_at}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, billing_last_payment_at: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Stripe customer</span>
                            <input
                              value={draft.stripe_customer_id}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, stripe_customer_id: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                              placeholder="cus_..."
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Stripe subscription</span>
                            <input
                              value={draft.stripe_subscription_id}
                              onChange={(e) =>
                                setDoctorDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: { ...draft, stripe_subscription_id: e.target.value },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                              placeholder="sub_..."
                            />
                          </label>
                        </div>

                        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.billing_cancel_at_period_end)}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, billing_cancel_at_period_end: e.target.checked },
                              }))
                            }
                          />
                          Cancelar al terminar el periodo
                        </label>
                        </div>
                      </div>
                    ) : null}

                    {isExpanded ? (
                      <>
                        <label className="mt-4 block space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-500">Notas internas SaaS</span>
                          <textarea
                            value={draft.saas_notes}
                            onChange={(e) =>
                              setDoctorDrafts((prev) => ({
                                ...prev,
                                [doctor.id]: { ...draft, saas_notes: e.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Notas de soporte, acuerdos comerciales, incidencias..."
                          />
                        </label>

                        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="text-xs font-bold text-slate-500">
                            Verificacion revisada: {doctor.verification_checked_by_name || "Sin registro"} •{" "}
                            {formatDateTime(doctor.verification_checked_at)}
                          </div>

                          <button
                            type="button"
                            onClick={() => saveDoctor(doctor.id)}
                            disabled={isSavingDoctor}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-cyan-700 disabled:opacity-60"
                          >
                            <Save size={16} />
                            <span>{isSavingDoctor ? "Guardando..." : "Guardar cambios del medico"}</span>
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
