import React, { useRef } from "react";
import { Save, Upload, Building2 } from "lucide-react";

const workingDays = [
  { key: 1, label: "Lunes" },
  { key: 2, label: "Martes" },
  { key: 3, label: "Miercoles" },
  { key: 4, label: "Jueves" },
  { key: 5, label: "Viernes" },
  { key: 6, label: "Sabado" },
  { key: 0, label: "Domingo" },
];

const timezoneOptions = [
  { value: "America/Tijuana", label: "Tijuana (America/Tijuana)" },
  { value: "America/Mazatlan", label: "Mazatlan (America/Mazatlan)" },
  { value: "America/Mexico_City", label: "Ciudad de Mexico (America/Mexico_City)" },
  { value: "America/Cancun", label: "Cancun (America/Cancun)" },
];

const defaultWorkingSchedule = {
  0: { activo: false, inicio: "09:00", fin: "17:00" },
  1: { activo: true, inicio: "09:00", fin: "17:00" },
  2: { activo: true, inicio: "09:00", fin: "17:00" },
  3: { activo: true, inicio: "09:00", fin: "17:00" },
  4: { activo: true, inicio: "09:00", fin: "17:00" },
  5: { activo: true, inicio: "09:00", fin: "17:00" },
  6: { activo: false, inicio: "09:00", fin: "14:00" },
};

export default function SettingsView({
  clinicConfig,
  setClinicConfig,
  onSave,
  isSaving,
  error,
}) {
  const fileInputRef = useRef(null);

  const update = (e) => {
    const { name, value } = e.target;
    setClinicConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 320;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        setClinicConfig((prev) => ({
          ...prev,
          logo_data_url: compressed,
        }));
      };

      if (typeof reader.result === "string") {
        image.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const workingSchedule = {
    ...defaultWorkingSchedule,
    ...(clinicConfig.horario_laboral || {}),
  };

  const updateWorkingDay = (dayKey, field, value) => {
    setClinicConfig((prev) => ({
      ...prev,
      horario_laboral: {
        ...defaultWorkingSchedule,
        ...(prev.horario_laboral || {}),
        [dayKey]: {
          ...defaultWorkingSchedule[dayKey],
          ...((prev.horario_laboral || {})[dayKey] || {}),
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-100 text-teal-700">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Configuracion del consultorio</h2>
              <p className="text-sm font-bold text-slate-500">
                Estos datos se usan en recetas, PDFs, consentimiento y aviso de privacidad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-black inline-flex items-center gap-2 hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            <Save size={18} />
            <span>{isSaving ? "Guardando..." : "Guardar cambios"}</span>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <section className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Datos del consultorio</p>
              <p className="text-xs font-bold text-slate-500">Informacion visible en documentos clinicos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Nombre del consultorio</label>
                <input
                  name="nombre_consultorio"
                  value={clinicConfig.nombre_consultorio || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Especialidad</label>
                <input
                  name="especialidad"
                  value={clinicConfig.especialidad || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Direccion</label>
                <input
                  name="direccion"
                  value={clinicConfig.direccion || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Telefono</label>
                <input
                  name="telefono"
                  value={clinicConfig.telefono || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Email de contacto</label>
                <input
                  name="email_contacto"
                  value={clinicConfig.email_contacto || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Cedula profesional</label>
                <input
                  name="cedula_profesional"
                  value={clinicConfig.cedula_profesional || ""}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Zona horaria</label>
                <select
                  name="zona_horaria"
                  value={clinicConfig.zona_horaria || "America/Tijuana"}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Logo</p>
              <p className="text-xs font-bold text-slate-500">Sube una imagen para mostrar en recetas y documentos</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 flex flex-col md:flex-row items-start gap-5">
              <div className="w-28 h-28 rounded-3xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                {clinicConfig.logo_data_url ? (
                  <img
                    src={clinicConfig.logo_data_url}
                    alt="Logo consultorio"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 size={28} className="text-slate-300" />
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black inline-flex items-center gap-2 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                >
                  <Upload size={18} />
                  <span>Subir logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClinicConfig((prev) => ({ ...prev, logo_data_url: "" }))}
                  className="px-5 py-3 rounded-2xl bg-slate-200 text-slate-700 font-black hover:bg-slate-300 transition-colors"
                >
                  Quitar logo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <p className="text-xs font-bold text-slate-500">
                  Se redimensiona automaticamente a un formato ligero para evitar errores al guardar.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Horario de trabajo</p>
              <p className="text-xs font-bold text-slate-500">
                Estos horarios se usan en la pagina publica del doctor. Los espacios se ofrecen en bloques de 1 hora.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              {workingDays.map((day) => {
                const schedule = workingSchedule[day.key] || defaultWorkingSchedule[day.key];

                return (
                  <div
                    key={day.key}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_0.8fr] gap-4 items-center"
                  >
                    <label className="inline-flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(schedule.activo)}
                        onChange={(e) => updateWorkingDay(day.key, "activo", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm font-black text-slate-700">{day.label}</span>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Inicio</span>
                      <input
                        type="time"
                        value={schedule.inicio}
                        onChange={(e) => updateWorkingDay(day.key, "inicio", e.target.value)}
                        disabled={!schedule.activo}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 disabled:opacity-50"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Fin</span>
                      <input
                        type="time"
                        value={schedule.fin}
                        onChange={(e) => updateWorkingDay(day.key, "fin", e.target.value)}
                        disabled={!schedule.activo}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 disabled:opacity-50"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
