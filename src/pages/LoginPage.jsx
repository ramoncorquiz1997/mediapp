import React, { useState } from "react";
import soloLogoMycliniq from "../assets/imagenes/solo_logo_mycliniq.png";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage({ onLogin, isLoading, error, notice, onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
            <span>Portal médico</span>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <img
              src={soloLogoMycliniq}
              alt="MyCliniq"
              className="h-[60px] w-[60px] object-contain drop-shadow-[0_10px_18px_rgba(45,212,191,0.24)]"
            />
            <div>
              <h1 className="brand-wordmark text-[2.05rem] font-black leading-none tracking-[-0.04em] text-slate-900">MyCliniq</h1>
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
                placeholder="doctora@MyCliniq.mx"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Contraseña</label>
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

          {notice ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {notice}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-teal-600 px-6 py-3 font-black text-white shadow-xl shadow-teal-200 transition-all hover:bg-teal-700 disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar al portal médico"}
          </button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
            Si aún no tienes cuenta, puedes enviar tu solicitud y revisaremos tus datos médicos antes de activar el acceso.
          </div>

          <button
            type="button"
            onClick={() => onNavigate("/registro-medico")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            Solicitar acceso
          </button>
        </form>
      </div>
    </div>
  );
}
