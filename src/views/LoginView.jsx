import React, { useState } from "react";
import { Activity, Lock, Mail } from "lucide-react";

export default function LoginView({ onLogin, isLoading, error }) {
  const [email, setEmail] = useState("doctora@cliniq.lat");
  const [password, setPassword] = useState("Cliniq2026!");

  const submit = async (e) => {
    e.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_45%,#e2e8f0_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-teal-100">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800"><Cliniq></Cliniq></h1>
              <p className="text-sm text-slate-500 font-bold">Acceso al consultorio</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase">Correo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                placeholder="doctora@cliniq.lat"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase">Contrasena</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                placeholder="********"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-500">
            Acceso inicial:
            <br />
            Correo: `doctora@cliniq.lat`
            <br />
            Contrasena: `Cliniq2026!`
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 rounded-2xl font-black bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
