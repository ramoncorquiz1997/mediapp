import React, { useState } from "react";
import { Activity, ArrowLeft, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

export default function LoginPage({ onLogin, isLoading, error, onNavigate }) {
  const [email, setEmail] = useState("doctora@cliniq.lat");
  const [password, setPassword] = useState("Cliniq2026!");

  const submit = async (e) => {
    e.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ccfbf1_0%,#f8fafc_42%,#e2e8f0_100%)] p-6">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        <div className="border-b border-slate-100 p-8">
          <button
            type="button"
            onClick={() => onNavigate("/")}
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition-colors hover:text-teal-700"
          >
            <ArrowLeft size={16} />
            <span>Volver al inicio</span>
          </button>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
            <ShieldCheck size={14} />
            <span>Portal medico</span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-600 p-3 text-white shadow-lg shadow-teal-100">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Cliniq</h1>
              <p className="text-sm font-bold text-slate-500">Acceso exclusivo para medicos</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 p-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Correo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="doctora@cliniq.mx"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Contrasena</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="********"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            Acceso inicial:
            <br />
            Correo: `doctora@cliniq.lat`
            <br />
            Contrasena: `Cliniq2026!`
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-xl shadow-teal-200 transition-all hover:bg-teal-700 disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar al portal medico"}
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/#patient-access")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50"
          >
            <UserRound size={16} />
            <span>Eres paciente? Accede aqui con tu CURP</span>
          </button>
        </form>
      </div>
    </div>
  );
}
