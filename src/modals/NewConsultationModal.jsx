import React from "react";
import {
  Activity,
  Thermometer,
  Heart,
  Wind,
  Search,
  ClipboardList,
  Info,
  Stethoscope,
  Plus,
  ChevronRight,
  Pill,
  Trash2,
  FlaskConical,
} from "lucide-react";
import { useImcInfo } from "../hooks/useImcInfo";
import { apiFetch } from "../lib/api";

export default function NewConsultationModal({
  open,
  onClose,
  consultation,
  setConsultation,
  onSave,
  patient,
  currentUser,
  clinicConfig,
  mode = "create",
  isSaving,
}) {
  const imcInfo = useImcInfo(consultation.peso, consultation.talla);
  const [cie10Options, setCie10Options] = React.useState([]);
  const [cie10Loading, setCie10Loading] = React.useState(false);
  const [cie10Open, setCie10Open] = React.useState(false);
  const [consentOpen, setConsentOpen] = React.useState(false);
  const [consentAccepted, setConsentAccepted] = React.useState(false);
  const [medicalActDescription, setMedicalActDescription] = React.useState("");

  const [medForm, setMedForm] = React.useState({
    nombre: "",
    presentacion: "Tableta",
    dosis: "",
    cadaCantidad: "",
    cadaUnidad: "Horas",
    duranteCantidad: "",
    duranteUnidad: "Dias",
  });
  const [studyForm, setStudyForm] = React.useState({
    nombre: "",
    tipo: "Laboratorio",
  });

  React.useEffect(() => {
    if (!open) {
      setMedForm({
        nombre: "",
        presentacion: "Tableta",
        dosis: "",
        cadaCantidad: "",
        cadaUnidad: "Horas",
        duranteCantidad: "",
        duranteUnidad: "Dias",
      });
      setStudyForm({
        nombre: "",
        tipo: "Laboratorio",
      });
      setCie10Options([]);
      setCie10Open(false);
      setConsentOpen(false);
      setConsentAccepted(false);
      setMedicalActDescription("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setMedicalActDescription((prev) =>
      prev ||
      `Consulta medica general con valoracion clinica, integracion diagnostica y definicion de plan terapeutico para ${patient?.nombre || "la paciente"}.`
    );
  }, [open, patient?.nombre]);

  React.useEffect(() => {
    if (!open) return undefined;

    const query = String(consultation.diagnostico || "").trim();
    if (query.length < 2) {
      setCie10Options([]);
      setCie10Open(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setCie10Loading(true);
        const response = await apiFetch(`/api/cie10?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error(`No se pudo consultar CIE-10 (${response.status})`);
        }

        const data = await response.json();
        setCie10Options(data);
        setCie10Open(true);
      } catch {
        setCie10Options([]);
      } finally {
        setCie10Loading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [consultation.diagnostico, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConsultation((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "diagnostico"
        ? {
            cie10Codigo: "",
            cie10Descripcion: "",
          }
        : {}),
    }));
  };

  const selectCie10 = (item) => {
    setConsultation((prev) => ({
      ...prev,
      diagnostico: item.descripcion,
      cie10Codigo: item.codigo,
      cie10Descripcion: item.descripcion,
    }));
    setCie10Options([]);
    setCie10Open(false);
  };

  const buildClinicalConsentText = () => {
    const consultationDate = new Date().toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });

    return [
      `Paciente: ${patient?.nombre || "Sin paciente"}`,
      `Fecha y hora: ${consultationDate}`,
      `Consultorio: ${clinicConfig?.nombre_consultorio || "Consultorio Paupediente"}`,
      `Acto medico: ${medicalActDescription.trim()}`,
      "Riesgos generales: molestias temporales, duda diagnostica inicial, necesidad de estudios complementarios, cambios de tratamiento y revaloracion medica conforme evolucion clinica.",
      `Medico tratante: ${currentUser?.nombre || "Sin medico"} - Cedula ${currentUser?.cedula_profesional || clinicConfig?.cedula_profesional || "Sin registro"}`,
      "La paciente manifiesta haber recibido informacion suficiente y acepta la atencion clinica registrada en esta consulta.",
    ].join("\n");
  };

  const confirmClinicalConsent = async () => {
    await onSave({
      texto: buildClinicalConsentText(),
      fecha: new Date().toISOString(),
      aceptado: true,
    });
    setConsentOpen(false);
    setConsentAccepted(false);
  };

  const consultationDateLabel = new Date().toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const isEditMode = mode === "edit";

  const updateMedForm = (e) => {
    const { name, value } = e.target;
    setMedForm((prev) => ({ ...prev, [name]: value }));
  };

  const addMedication = () => {
    if (!medForm.nombre.trim()) return;

    const item = {
      id: Date.now(),
      nombre: medForm.nombre.trim(),
      presentacion: medForm.presentacion,
      dosis: medForm.dosis.trim(),
      cadaCantidad: medForm.cadaCantidad,
      cadaUnidad: medForm.cadaUnidad,
      duranteCantidad: medForm.duranteCantidad,
      duranteUnidad: medForm.duranteUnidad,
    };

    setConsultation((prev) => ({
      ...prev,
      medicamentos: [item, ...(prev.medicamentos ?? [])],
    }));

    setMedForm({
      nombre: "",
      presentacion: "Tableta",
      dosis: "",
      cadaCantidad: "",
      cadaUnidad: "Horas",
      duranteCantidad: "",
      duranteUnidad: "Dias",
    });
  };

  const removeMedication = (id) => {
    setConsultation((prev) => ({
      ...prev,
      medicamentos: (prev.medicamentos ?? []).filter((m) => m.id !== id),
    }));
  };

  const updateStudyForm = (e) => {
    const { name, value } = e.target;
    setStudyForm((prev) => ({ ...prev, [name]: value }));
  };

  const addStudy = () => {
    if (!studyForm.nombre.trim()) return;

    const item = {
      id: Date.now(),
      nombre: studyForm.nombre.trim(),
      tipo: studyForm.tipo,
      estado: "Solicitado",
    };

    setConsultation((prev) => ({
      ...prev,
      estudios: [item, ...(prev.estudios ?? [])],
    }));

    setStudyForm({
      nombre: "",
      tipo: "Laboratorio",
    });
  };

  const removeStudy = (id) => {
    setConsultation((prev) => ({
      ...prev,
      estudios: (prev.estudios ?? []).filter((item) => item.id !== id),
    }));
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {isEditMode ? "Editar consulta" : "Atencion Clinica"}
              </h3>
              <p className="text-sm text-slate-500">
                Paciente: {patient?.nombre || "Sin paciente seleccionado"} |{" "}
                <span className="font-bold text-teal-600">
                  {patient?.external_id || "Sin expediente"}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
            aria-label="Cerrar"
            title="Cerrar"
            disabled={isSaving}
          >
            X
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-emerald-800 rounded-3xl overflow-hidden shadow-xl border border-emerald-700/50">
                <div className="p-4 bg-emerald-900/40 flex items-center justify-between text-white border-b border-emerald-700/30">
                  <div className="flex items-center space-x-2">
                    <Activity size={18} className="text-emerald-300" />
                    <span className="font-black text-xs uppercase tracking-widest">Signos Vitales</span>
                  </div>
                  <Thermometer size={16} className="text-emerald-400 opacity-50" />
                </div>

                <div className="p-6 space-y-5 bg-gradient-to-b from-emerald-800 to-emerald-900">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase">Peso (kg)</label>
                      <input
                        name="peso"
                        value={consultation.peso}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all font-bold"
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase">Talla (m)</label>
                      <input
                        name="talla"
                        value={consultation.talla}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all font-bold"
                        placeholder="1.70"
                      />
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-emerald-600/30 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-300/80 uppercase mb-1">IMC / Estado</p>
                      <p className={`text-lg font-black ${imcInfo.color}`}>{imcInfo.categoria}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{imcInfo.valor}</span>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">kg/m2</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-300/80 uppercase">
                      Tension Arterial (mmHg)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        name="taSistolica"
                        value={consultation.taSistolica}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none placeholder:text-emerald-600/50 font-bold text-center"
                        placeholder="Sist."
                      />
                      <span className="text-emerald-400 font-bold">/</span>
                      <input
                        name="taDiastolica"
                        value={consultation.taDiastolica}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none placeholder:text-emerald-600/50 font-bold text-center"
                        placeholder="Diast."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase flex items-center">
                        <Heart size={10} className="mr-1" /> FC (lpm)
                      </label>
                      <input
                        name="frecuenciaCardiaca"
                        value={consultation.frecuenciaCardiaca}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none font-bold"
                        placeholder="70"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase flex items-center">
                        <Wind size={10} className="mr-1" /> FR (rpm)
                      </label>
                      <input
                        name="frecuenciaRespiratoria"
                        value={consultation.frecuenciaRespiratoria}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none font-bold"
                        placeholder="18"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase">Temp (C)</label>
                      <input
                        name="temperatura"
                        value={consultation.temperatura}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none font-bold"
                        placeholder="36.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase">Glucosa</label>
                      <input
                        name="glucosa"
                        value={consultation.glucosa}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white/10 border border-emerald-600/50 rounded-xl text-white outline-none font-bold"
                        placeholder="95"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <Search size={16} className="mr-2 text-teal-600" />
                  Exploracion Fisica
                </label>
                <textarea
                  name="descripcionFisica"
                  value={consultation.descripcionFisica}
                  onChange={handleChange}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-40 resize-none outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm leading-relaxed"
                  placeholder="Describa hallazgos fisicos relevantes..."
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <Info size={16} className="mr-2 text-teal-600" /> Motivo de Consulta
                </label>
                <input
                  name="motivo"
                  value={consultation.motivo}
                  onChange={handleChange}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                  placeholder="Ej: Dolor abdominal recurrente..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <ClipboardList size={16} className="mr-2 text-teal-600" /> Padecimiento Actual
                </label>
                <textarea
                  name="padecimientoActual"
                  value={consultation.padecimientoActual}
                  onChange={(e) => {
                    handleChange(e);
                    autoResize(e);
                  }}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all leading-relaxed resize-none overflow-hidden"
                  placeholder="Describa el curso de la enfermedad actual, sintomas, cronologia..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <Stethoscope size={16} className="mr-2 text-teal-600" /> Diagnostico
                </label>
                <div className="relative">
                  <input
                    name="diagnostico"
                    value={consultation.diagnostico}
                    onChange={handleChange}
                    onFocus={() => {
                      if (cie10Options.length) setCie10Open(true);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                    placeholder="Busca diagnostico CIE-10..."
                  />

                  {cie10Open ? (
                    <div className="absolute z-20 top-[calc(100%+8px)] left-0 right-0 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                      {cie10Loading ? (
                        <div className="px-4 py-3 text-sm font-bold text-slate-500">Buscando CIE-10...</div>
                      ) : cie10Options.length === 0 ? (
                        <div className="px-4 py-3 text-sm font-bold text-slate-500">
                          No se encontraron coincidencias.
                        </div>
                      ) : (
                        cie10Options.map((item) => (
                          <button
                            key={item.codigo}
                            type="button"
                            onClick={() => selectCie10(item)}
                            className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors border-t first:border-t-0 border-slate-100"
                          >
                            <p className="text-sm font-black text-teal-700">{item.codigo}</p>
                            <p className="text-sm font-bold text-slate-700">{item.descripcion}</p>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">
                    {consultation.cie10Codigo
                      ? `CIE-10 seleccionado: ${consultation.cie10Codigo}`
                      : "Selecciona un diagnostico del catalogo para guardar codigo y descripcion."}
                  </p>
                  {consultation.cie10Codigo ? (
                    <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black">
                      {consultation.cie10Codigo}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <Info size={16} className="mr-2 text-teal-600" /> Pronostico
                </label>
                <textarea
                  name="pronostico"
                  value={consultation.pronostico ?? ""}
                  onChange={(e) => {
                    handleChange(e);
                    autoResize(e);
                  }}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all leading-relaxed resize-none overflow-hidden"
                  placeholder="Ej: Bueno a corto plazo con apego al tratamiento y vigilancia clinica."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 flex items-center uppercase tracking-tighter">
                  <Stethoscope size={16} className="mr-2 text-teal-600" /> Plan de tratamiento
                </label>
                <textarea
                  name="planTratamiento"
                  value={consultation.planTratamiento ?? ""}
                  onChange={(e) => {
                    handleChange(e);
                    autoResize(e);
                  }}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all leading-relaxed resize-none overflow-hidden"
                  placeholder="Indicaciones, medicamentos, estudios, seguimiento..."
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                      <Pill size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Receta</p>
                      <p className="text-xs text-slate-500">Agrega medicamentos y pauta</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addMedication}
                    className="px-4 py-2 bg-teal-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
                  >
                    Agregar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Medicamento</label>
                    <input
                      name="nombre"
                      value={medForm.nombre}
                      onChange={updateMedForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder="Ej: Amoxicilina"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Presentacion</label>
                    <select
                      name="presentacion"
                      value={medForm.presentacion}
                      onChange={updateMedForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    >
                      <option>Tableta</option>
                      <option>Capsula</option>
                      <option>Pastilla</option>
                      <option>Jarabe</option>
                      <option>Cucharada</option>
                      <option>mL</option>
                      <option>Gotas</option>
                      <option>Inhalacion</option>
                      <option>Inyeccion</option>
                      <option>Parche</option>
                      <option>Crema</option>
                      <option>Unguento</option>
                      <option>Spray</option>
                      <option>Supositorio</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Dosis (libre)</label>
                    <input
                      name="dosis"
                      value={medForm.dosis}
                      onChange={updateMedForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder="Ej: 500 mg"
                    />
                  </div>

                  <div className="md:col-span-6 grid grid-cols-12 gap-3">
                    <div className="col-span-5 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Cada</label>
                      <input
                        name="cadaCantidad"
                        value={medForm.cadaCantidad}
                        onChange={updateMedForm}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        placeholder="Ej: 8"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="col-span-7 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Unidad</label>
                      <select
                        name="cadaUnidad"
                        value={medForm.cadaUnidad}
                        onChange={updateMedForm}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      >
                        <option>Minutos</option>
                        <option>Horas</option>
                        <option>Dias</option>
                        <option>Semanas</option>
                        <option>Meses</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-6 grid grid-cols-12 gap-3">
                    <div className="col-span-5 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Durante</label>
                      <input
                        name="duranteCantidad"
                        value={medForm.duranteCantidad}
                        onChange={updateMedForm}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        placeholder="Ej: 7"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="col-span-7 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Unidad</label>
                      <select
                        name="duranteUnidad"
                        value={medForm.duranteUnidad}
                        onChange={updateMedForm}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      >
                        <option>Dias</option>
                        <option>Semanas</option>
                        <option>Meses</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {(consultation.medicamentos ?? []).length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                      Aun no agregas medicamentos.
                    </div>
                  ) : (
                    (consultation.medicamentos ?? []).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 truncate">
                            {m.nombre}{" "}
                            <span className="text-slate-400 font-bold">| {m.presentacion}</span>
                            {m.dosis ? <span className="text-slate-400 font-bold"> | {m.dosis}</span> : null}
                          </p>
                          <p className="text-xs text-slate-500 font-bold">
                            {m.cadaCantidad ? `Cada ${m.cadaCantidad} ${m.cadaUnidad.toLowerCase()}` : "Cada --"} |{" "}
                            {m.duranteCantidad
                              ? `Durante ${m.duranteCantidad} ${m.duranteUnidad.toLowerCase()}`
                              : "Durante --"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMedication(m.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white transition-all"
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <FlaskConical size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Estudios solicitados</p>
                      <p className="text-xs text-slate-500">Laboratorio o gabinete solicitado en esta consulta</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addStudy}
                    className="px-4 py-2 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                  >
                    Agregar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Estudio</label>
                    <input
                      name="nombre"
                      value={studyForm.nombre}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder="Ej: Biometria hemática, QS, RX torax"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
                    <select
                      name="tipo"
                      value={studyForm.tipo}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    >
                      <option>Laboratorio</option>
                      <option>Gabinete</option>
                      <option>Imagen</option>
                      <option>Interconsulta</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {(consultation.estudios ?? []).length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                      Aun no agregas estudios.
                    </div>
                  ) : (
                    (consultation.estudios ?? []).map((study) => (
                      <div
                        key={study.id}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 truncate">{study.nombre}</p>
                          <p className="text-xs text-slate-500 font-bold">
                            {study.tipo} | {study.estado || "Solicitado"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeStudy(study.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-white transition-all"
                          title="Eliminar estudio"
                          aria-label="Eliminar estudio"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 px-10">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Expediente activo: {patient?.external_id || "Sin expediente"}
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (isEditMode) {
                  onSave(null);
                } else {
                  setConsentOpen(true);
                }
              }}
              disabled={isSaving || !patient || !consultation.cie10Codigo}
              className="px-10 py-3 bg-teal-600 text-white rounded-2xl font-black shadow-xl shadow-teal-200 hover:bg-teal-700 hover:-translate-y-0.5 transition-all flex items-center disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span>{isSaving ? "Guardando..." : isEditMode ? "Guardar cambios" : "Finalizar Consulta"}</span>
              <ChevronRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>

      {consentOpen && !isEditMode ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <p className="text-lg font-black text-slate-800">Consentimiento informado clinico</p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Confirmacion previa al guardado de la consulta
              </p>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">Paciente</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{patient?.nombre || "Sin paciente"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">Fecha y hora</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{consultationDateLabel}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Descripcion del acto medico</label>
                <textarea
                  value={medicalActDescription}
                  onChange={(e) => setMedicalActDescription(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-28 resize-none"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-[10px] font-black uppercase text-amber-600">Riesgos generales</p>
                <p className="text-sm font-bold text-amber-800 mt-2 leading-relaxed">
                  Molestias temporales, persistencia o progresion de sintomas, necesidad de estudios complementarios,
                  ajustes terapeuticos, reacciones no esperadas al tratamiento y necesidad de revaloracion medica.
                </p>
              </div>

              <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
                <p className="text-[10px] font-black uppercase text-teal-600">Medico responsable</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{currentUser?.nombre || "Sin medico"}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Cedula: {currentUser?.cedula_profesional || clinicConfig?.cedula_profesional || "Sin registro"}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  {clinicConfig?.nombre_consultorio || "Consultorio Paupediente"}
                </p>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-slate-600 leading-relaxed">
                  Confirmo que la paciente acepta el acto medico descrito, comprende los riesgos generales y autoriza
                  registrar este consentimiento junto con la consulta.
                </span>
              </label>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-700"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClinicalConsent}
                disabled={isSaving || !consentAccepted || !medicalActDescription.trim()}
                className="px-8 py-3 rounded-2xl font-black bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Aceptar y guardar consulta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
