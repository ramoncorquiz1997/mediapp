import React, { useEffect, useState } from "react";
import { BadgeCheck, EyeOff, Mail, Plus, Save, SearchCheck, Shield, UserPlus, Users } from "lucide-react";

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
}) {
  const [loginForm, setLoginForm] = useState(defaultOwnerLogin);
  const [doctorForm, setDoctorForm] = useState(defaultDoctorForm);
  const [smtpForm, setSmtpForm] = useState(defaultSmtpForm);
  const [leadDrafts, setLeadDrafts] = useState({});
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

  const formatLeadDate = (value) => {
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

  const saveLead = async (leadId) => {
    const draft = leadDrafts[leadId];
    if (!draft) return;
    await onUpdateLead(leadId, draft);
  };

  const handleDoctorCedulaChange = (value) => {
    setDoctorForm((prev) => ({ ...prev, cedula_profesional: value.replace(/\D/g, "").slice(0, 8) }));
    setDoctorLicenseValidation(null);
    setDoctorLicenseMessage("");
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
      <div className="mx-auto max-w-6xl space-y-6">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">SMTP y leads</h2>
                <p className="text-sm font-bold text-slate-500">
                  Configura el correo que recibira las solicitudes de demo.
                </p>
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">SMTP host</label>
                  <input
                    value={smtpForm.smtp_host || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_host: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">SMTP port</label>
                  <input
                    type="number"
                    value={smtpForm.smtp_port || 587}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_port: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Usuario SMTP</label>
                  <input
                    value={smtpForm.smtp_user || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_user: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="tucorreo@gmail.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Password SMTP</label>
                  <input
                    type="password"
                    value={smtpForm.smtp_password || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_password: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={smtpForm.smtp_password_configured ? "Dejar vacio para conservar actual" : "Nueva password SMTP"}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Correo remitente</label>
                  <input
                    type="email"
                    value={smtpForm.smtp_from_email || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, smtp_from_email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="noreply@mycliniq.lat"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Correo receptor de leads</label>
                  <input
                    type="email"
                    value={smtpForm.leads_notify_email || ""}
                    onChange={(e) => setSmtpForm((prev) => ({ ...prev, leads_notify_email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="ventas@mycliniq.lat"
                  />
                </div>
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Nombre</label>
                  <input
                    value={doctorForm.nombre}
                    onChange={(e) => setDoctorForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Correo</label>
                  <input
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Password inicial</label>
                    <input
                      type="password"
                      value={doctorForm.password}
                      onChange={(e) => setDoctorForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Rol</label>
                    <select
                      value={doctorForm.rol}
                      onChange={(e) => setDoctorForm((prev) => ({ ...prev, rol: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="medico">Medico</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Cedula profesional</label>
                    <div className="flex flex-col gap-3 md:flex-row">
                      <input
                        value={doctorForm.cedula_profesional}
                        onChange={(e) => handleDoctorCedulaChange(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                        inputMode="numeric"
                        maxLength={8}
                      />
                      <button
                        type="button"
                        onClick={validateDoctorLicense}
                        disabled={isValidatingDoctorLicense || doctorForm.cedula_profesional.trim().length < 7}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-black text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60"
                      >
                        <SearchCheck size={16} />
                        <span>{isValidatingDoctorLicense ? "Validando..." : "Validar cédula"}</span>
                      </button>
                    </div>
                    {doctorLicenseMessage ? (
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                          doctorLicenseValidation?.valid && doctorLicenseValidation?.isMedicalDoctor
                            ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border border-amber-100 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {doctorLicenseMessage}
                      </div>
                    ) : null}
                    {doctorLicenseValidation?.valid ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex items-start gap-3">
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
                            <p className={doctorLicenseValidation.isMedicalDoctor ? "text-emerald-700" : "text-amber-700"}>
                              {doctorLicenseValidation.isMedicalDoctor
                                ? "Profesion medica permitida"
                                : "La cedula existe, pero no pasa como medico permitido"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Slug opcional</label>
                    <input
                      value={doctorForm.slug}
                      onChange={(e) => setDoctorForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

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
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Medicos registrados</h2>
                  <p className="text-sm font-bold text-slate-500">Vista rapida de usuarios operativos.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {doctorsLoading ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Cargando medicos...
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                    Aun no hay medicos registrados.
                  </div>
                ) : (
                  doctors.map((doctor) => (
                    <div key={doctor.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-black text-slate-800">{doctor.nombre}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {doctor.email} • {doctor.rol} • {doctor.cedula_profesional || "Sin cedula"} •{" "}
                        {doctor.activo ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                  <Mail size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Leads recibidos</h2>
                  <p className="text-sm font-bold text-slate-500">
                    Solicitudes de demo guardadas aunque falle el correo.
                  </p>
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
                            <p className="mt-1 text-xs font-bold text-slate-500 break-all">
                              {lead.email} • {lead.telefono || "Sin telefono"} • {lead.especialidad || "Sin especialidad"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-2xl bg-white px-3 py-2 text-[11px] font-black text-slate-500">
                            {formatLeadDate(lead.fecha || lead.created_at)}
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
                            placeholder="Notas de seguimiento..."
                          />

                          <button
                            type="button"
                            onClick={() => saveLead(lead.id)}
                            disabled={updatingLeadId === lead.id}
                            className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
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
      </div>
    </div>
  );
}
