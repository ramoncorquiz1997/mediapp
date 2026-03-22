import React, { useState } from "react";
import { Activity, ArrowLeft, FileCheck2, Lock, Mail, MapPin, Phone, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

const countryCodeOptions = [
  { value: "+52", label: "MX +52" },
  { value: "+1", label: "US/CA +1" },
  { value: "+57", label: "CO +57" },
  { value: "+54", label: "AR +54" },
  { value: "+34", label: "ES +34" },
];

const defaultForm = {
  nombre: "",
  email: "",
  telefono_codigo_pais: "+52",
  telefono: "",
  cedula_profesional: "",
  especialidad: "",
  ciudad_estado: "",
  nombre_consultorio: "",
  password: "",
  notas_onboarding: "",
};

export default function RegisterDoctorPage({ onSubmit, isSubmitting, error, successMessage, onNavigate }) {
  const [form, setForm] = useState(defaultForm);

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onSubmit(form);
    if (ok) {
      setForm(defaultForm);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ccfbf1_0%,#f8fafc_42%,#e2e8f0_100%)] p-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        <div className="border-b border-slate-100 p-8">
          <button
            type="button"
            onClick={() => onNavigate("/login")}
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition-colors hover:text-teal-700"
          >
            <ArrowLeft size={16} />
            <span>Volver al acceso medico</span>
          </button>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
            <ShieldCheck size={14} />
            <span>Solicitud de acceso</span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-600 p-3 text-white shadow-lg shadow-teal-100">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Crear cuenta medica</h1>
              <p className="text-sm font-bold text-slate-500">
                Revisamos manualmente cada solicitud antes de activar el acceso al portal.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Nombre completo</span>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Correo</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Telefono</span>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                <select
                  value={form.telefono_codigo_pais}
                  onChange={(e) => setForm((prev) => ({ ...prev, telefono_codigo_pais: e.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {countryCodeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, telefono: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="6641234567"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400">
                Captura solo 10 digitos. Guardaremos el numero con el codigo de pais seleccionado.
              </p>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Cedula profesional</span>
              <div className="relative">
                <FileCheck2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={form.cedula_profesional}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cedula_profesional: e.target.value.replace(/\D/g, "").slice(0, 8) }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Especialidad</span>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={form.especialidad}
                  onChange={(e) => setForm((prev) => ({ ...prev, especialidad: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-slate-500">Ciudad y estado</span>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={form.ciudad_estado}
                  onChange={(e) => setForm((prev) => ({ ...prev, ciudad_estado: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Nombre del consultorio</span>
            <input
              value={form.nombre_consultorio}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre_consultorio: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Contrasena</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500">Notas para verificacion</span>
            <textarea
              value={form.notas_onboarding}
              onChange={(e) => setForm((prev) => ({ ...prev, notas_onboarding: e.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Puedes dejarnos contexto adicional sobre tu consultorio o tu practica."
            />
          </label>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
            Tu cuenta quedara en revision manual. Cuando aprobemos tus datos medicos, podras entrar al portal normalmente.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-xl shadow-teal-200 transition-all hover:bg-teal-700 disabled:opacity-60"
            >
              {isSubmitting ? "Enviando solicitud..." : "Enviar solicitud de acceso"}
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/login")}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ya tengo cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
