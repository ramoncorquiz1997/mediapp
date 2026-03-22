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
  const administrationRoutes = [
    "Oral",
    "Sublingual",
    "Topica",
    "Intramuscular",
    "Intravenosa",
    "Subcutanea",
    "Inhalatoria",
    "Oftalmica",
    "Otica",
    "Nasal",
    "Rectal",
    "Vaginal",
  ];
  const imcInfo = useImcInfo(consultation.peso, consultation.talla);
  const [cie10Options, setCie10Options] = React.useState([]);
  const [cie10Loading, setCie10Loading] = React.useState(false);
  const [cie10Open, setCie10Open] = React.useState(false);
  const [skipNextCie10Lookup, setSkipNextCie10Lookup] = React.useState(false);
  const [consentOpen, setConsentOpen] = React.useState(false);
  const [consentForm, setConsentForm] = React.useState({
    lugarEmision: "",
    actoMedico: "",
    riesgosGenerales:
      "Molestias temporales, persistencia o progresion de sintomas, necesidad de estudios complementarios, ajustes terapeuticos, reacciones no esperadas al tratamiento y necesidad de revaloracion medica.",
    beneficiosEsperados: "",
    autorizacionContingencias: false,
    pacienteNombre: "",
    pacienteFirma: "",
    testigoUnoNombre: "",
    testigoUnoFirma: "",
    testigoDosNombre: "",
    testigoDosFirma: "",
    medicoNombre: "",
    medicoCedula: "",
    medicoFirma: "",
    aceptado: false,
  });

  const [medForm, setMedForm] = React.useState({
    nombre: "",
    presentacion: "Tableta",
    dosis: "",
    viaAdministracion: "Oral",
    cadaCantidad: "",
    cadaUnidad: "Horas",
    duranteCantidad: "",
    duranteUnidad: "Dias",
  });

  React.useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  const [studyForm, setStudyForm] = React.useState({
    nombre: "",
    tipo: "Laboratorio",
    problemaClinico: "",
    fechaEstudio: "",
    interpretacion: "",
    medicoSolicitaNombre: "",
    medicoSolicitaCedula: "",
  });

  React.useEffect(() => {
    if (!open) {
      setMedForm({
        nombre: "",
        presentacion: "Tableta",
        dosis: "",
        viaAdministracion: "Oral",
        cadaCantidad: "",
        cadaUnidad: "Horas",
        duranteCantidad: "",
        duranteUnidad: "Dias",
      });
      setStudyForm({
        nombre: "",
        tipo: "Laboratorio",
        problemaClinico: "",
        fechaEstudio: "",
        interpretacion: "",
        medicoSolicitaNombre: "",
        medicoSolicitaCedula: "",
      });
      setCie10Options([]);
      setCie10Open(false);
      setSkipNextCie10Lookup(false);
      setConsentOpen(false);
      setConsentForm({
        lugarEmision: "",
        actoMedico: "",
        riesgosGenerales:
          "Molestias temporales, persistencia o progresion de sintomas, necesidad de estudios complementarios, ajustes terapeuticos, reacciones no esperadas al tratamiento y necesidad de revaloracion medica.",
        beneficiosEsperados: "",
        autorizacionContingencias: false,
        pacienteNombre: "",
        pacienteFirma: "",
        testigoUnoNombre: "",
        testigoUnoFirma: "",
        testigoDosNombre: "",
        testigoDosFirma: "",
        medicoNombre: "",
        medicoCedula: "",
        medicoFirma: "",
        aceptado: false,
      });
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setConsentForm((prev) => ({
      ...prev,
      lugarEmision: prev.lugarEmision || clinicConfig?.direccion || "Tijuana, Baja California",
      actoMedico:
        prev.actoMedico ||
        `Consulta medica general con valoracion clinica, integracion diagnostica y definicion de plan terapeutico para ${patient?.nombre || "la paciente"}.`,
      pacienteNombre: prev.pacienteNombre || patient?.nombre || "",
      medicoNombre: prev.medicoNombre || currentUser?.nombre || "",
      medicoCedula:
        prev.medicoCedula || currentUser?.cedula_profesional || clinicConfig?.cedula_profesional || "",
      medicoFirma: prev.medicoFirma || currentUser?.nombre || "",
    }));
  }, [clinicConfig?.cedula_profesional, clinicConfig?.direccion, currentUser?.cedula_profesional, currentUser?.nombre, open, patient?.nombre]);

  React.useEffect(() => {
    if (!open) return undefined;

    if (
      consultation.cie10Codigo &&
      String(consultation.cie10Descripcion || consultation.diagnostico || "").trim() ===
        String(consultation.diagnostico || "").trim()
    ) {
      setCie10Options([]);
      setCie10Open(false);
      return undefined;
    }

    if (skipNextCie10Lookup) {
      setSkipNextCie10Lookup(false);
      return undefined;
    }

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
  }, [consultation.diagnostico, open, skipNextCie10Lookup]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "diagnostico") {
      setSkipNextCie10Lookup(false);
    }
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
    setSkipNextCie10Lookup(true);
    setConsultation((prev) => ({
      ...prev,
      diagnostico: item.descripcion,
      cie10Codigo: item.codigo,
      cie10Descripcion: item.descripcion,
    }));
    setCie10Options([]);
    setCie10Open(false);
  };

  const updateConsentForm = (event) => {
    const { name, value, type, checked } = event.target;
    setConsentForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildClinicalConsentPayload = () => {
    const consultationDate = new Date().toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const text = [
      `${clinicConfig?.nombre_consultorio || "Consultorio MyCliniq"}`,
      `Lugar de emision: ${consentForm.lugarEmision.trim()}`,
      `Fecha y hora: ${consultationDate}`,
      `Paciente: ${consentForm.pacienteNombre.trim()}`,
      "Titulo del documento: Consentimiento informado clinico",
      `Acto autorizado: ${consentForm.actoMedico.trim()}`,
      `Riesgos generales: ${consentForm.riesgosGenerales.trim()}`,
      `Beneficios esperados: ${consentForm.beneficiosEsperados.trim()}`,
      `Autorizacion para contingencias: ${consentForm.autorizacionContingencias ? "Si" : "No"}`,
      `Paciente firma de conformidad: ${consentForm.pacienteFirma.trim()}`,
      `Medico que recaba: ${consentForm.medicoNombre.trim()} / Cedula: ${consentForm.medicoCedula.trim()} / Firma: ${consentForm.medicoFirma.trim()}`,
    ].join("\n");

    return {
      texto: text,
      lugar_emision: consentForm.lugarEmision.trim(),
      acto_medico: consentForm.actoMedico.trim(),
      riesgos_generales: consentForm.riesgosGenerales.trim(),
      beneficios_esperados: consentForm.beneficiosEsperados.trim(),
      autorizacion_contingencias: consentForm.autorizacionContingencias,
      paciente_nombre: consentForm.pacienteNombre.trim(),
      paciente_firma: consentForm.pacienteFirma.trim(),
      testigo_uno_nombre: "",
      testigo_uno_firma: "",
      testigo_dos_nombre: "",
      testigo_dos_firma: "",
      medico_nombre: consentForm.medicoNombre.trim(),
      medico_cedula: consentForm.medicoCedula.trim(),
      medico_firma: consentForm.medicoFirma.trim(),
      fecha: new Date().toISOString(),
      aceptado: true,
    };
  };

  const openPrintableConsent = () => {
    const payload = buildClinicalConsentPayload();
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
    if (!win) return;

    const escapeHtml = (value) =>
      String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const consultationDateText = new Date(payload.fecha).toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });

    win.document.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Consentimiento informado clinico</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; background: #f8fafc; }
            .page { max-width: 860px; margin: 0 auto; background: #fff; padding: 40px; }
            h1 { margin: 0 0 8px; font-size: 26px; }
            h2 { margin: 24px 0 8px; font-size: 14px; text-transform: uppercase; color: #0f766e; letter-spacing: .08em; }
            p, li { font-size: 14px; line-height: 1.6; }
            .card { border: 1px solid #dbe4ea; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
            .line { margin-top: 42px; padding-top: 8px; border-top: 1px solid #64748b; font-size: 13px; }
            .muted { color: #475569; }
            @media print {
              body { background: #fff; }
              .page { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <h1>${escapeHtml(clinicConfig?.nombre_consultorio || "Consultorio MyCliniq")}</h1>
            <p class="muted">${escapeHtml(clinicConfig?.direccion || "Tijuana, Baja California")} | Tel. ${escapeHtml(
              clinicConfig?.telefono || "Sin telefono"
            )}</p>
            <p class="muted">Cedula profesional: ${escapeHtml(payload.medico_cedula || "Sin registro")}</p>

            <div class="card">
              <h2>Consentimiento informado clinico</h2>
              <div class="grid">
                <p><strong>Lugar de emision:</strong><br />${escapeHtml(payload.lugar_emision)}</p>
                <p><strong>Fecha y hora:</strong><br />${escapeHtml(consultationDateText)}</p>
                <p><strong>Paciente:</strong><br />${escapeHtml(payload.paciente_nombre)}</p>
                <p><strong>Medico:</strong><br />${escapeHtml(payload.medico_nombre)}</p>
              </div>
            </div>

            <div class="card">
              <h2>Acto autorizado</h2>
              <p>${escapeHtml(payload.acto_medico)}</p>
            </div>

            <div class="card">
              <h2>Riesgos y beneficios</h2>
              <p><strong>Riesgos generales:</strong> ${escapeHtml(payload.riesgos_generales)}</p>
              <p><strong>Beneficios esperados:</strong> ${escapeHtml(payload.beneficios_esperados)}</p>
              <p><strong>Autorizacion para contingencias:</strong> ${
                payload.autorizacion_contingencias ? "Si, autorizada." : "No autorizada."
              }</p>
            </div>

            <div class="card">
              <p>
                El paciente declara haber recibido explicacion suficiente sobre el acto autorizado, sus riesgos y beneficios,
                y firma de conformidad para atencion medica.
              </p>
              <div class="grid">
                <div class="line">${escapeHtml(payload.paciente_firma)}<br />Firma del paciente</div>
                <div class="line">${escapeHtml(payload.medico_firma)}<br />Firma del medico que recaba</div>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const confirmClinicalConsent = async () => {
    await onSave(buildClinicalConsentPayload());
    setConsentOpen(false);
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
      viaAdministracion: medForm.viaAdministracion,
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
      viaAdministracion: "Oral",
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
      problemaClinico: studyForm.problemaClinico.trim(),
      fechaEstudio: studyForm.fechaEstudio || "",
      interpretacion: studyForm.interpretacion.trim(),
      medicoSolicitaNombre:
        studyForm.medicoSolicitaNombre.trim() || currentUser?.nombre || "",
      medicoSolicitaCedula:
        studyForm.medicoSolicitaCedula.trim() ||
        currentUser?.cedula_profesional ||
        clinicConfig?.cedula_profesional ||
        "",
    };

    setConsultation((prev) => ({
      ...prev,
      estudios: [item, ...(prev.estudios ?? [])],
    }));

    setStudyForm({
      nombre: "",
      tipo: "Laboratorio",
      problemaClinico: "",
      fechaEstudio: "",
      interpretacion: "",
      medicoSolicitaNombre: "",
      medicoSolicitaCedula: "",
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-in zoom-in-95 duration-200 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
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
                      <p className="text-[10px] font-black text-emerald-300/80 uppercase mb-1">Indice de masa corporal (IMC) / Estado</p>
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
                        <Heart size={10} className="mr-1" /> Frecuencia cardiaca (FC) (lpm)
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
                        <Wind size={10} className="mr-1" /> Frecuencia respiratoria (FR) (rpm)
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
                      <label className="text-[10px] font-black text-emerald-300/80 uppercase">Temperatura (Temp) (C)</label>
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
                  value={consultation.descripcionFisica ?? consultation.habitusExterior ?? ""}
                  onChange={handleChange}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-40 resize-none outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm leading-relaxed"
                  placeholder="Habitus exterior: ... | Cabeza: ... | Cuello: ... | Torax: ... | Abdomen: ... | Extremidades: ... | Genitales: ..."
                />
                <p className="text-xs font-bold text-slate-500">
                  Usa lenguaje clinico libre. El placeholder solo sirve como guia para recordar los segmentos recomendados por la norma.
                </p>
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
                  <ClipboardList size={16} className="mr-2 text-teal-600" /> Interrogatorio por aparatos y sistemas
                </label>
                <textarea
                  name="interrogatorioAparatosSistemas"
                  value={consultation.interrogatorioAparatosSistemas ?? ""}
                  onChange={(e) => {
                    handleChange(e);
                    autoResize(e);
                  }}
                  rows={2}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all leading-relaxed resize-none overflow-hidden"
                  placeholder="Cardiovascular, respiratorio, digestivo, genitourinario, musculoesqueletico, neurologico, endocrino, dermatologico..."
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

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Via de administracion</label>
                    <select
                      name="viaAdministracion"
                      value={medForm.viaAdministracion}
                      onChange={updateMedForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    >
                      {administrationRoutes.map((route) => (
                        <option key={route}>{route}</option>
                      ))}
                    </select>
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
                            Via: {m.viaAdministracion || "Sin via"} |{" "}
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

                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Problema clinico en estudio</label>
                    <input
                      name="problemaClinico"
                      value={studyForm.problemaClinico}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder="Ej: Dolor abdominal, anemia en estudio, infeccion respiratoria, control metabolico..."
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Fecha del estudio</label>
                    <input
                      type="datetime-local"
                      name="fechaEstudio"
                      value={studyForm.fechaEstudio}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Medico solicita</label>
                    <input
                      name="medicoSolicitaNombre"
                      value={studyForm.medicoSolicitaNombre}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder={currentUser?.nombre || "Nombre del medico"}
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Cedula del medico</label>
                    <input
                      name="medicoSolicitaCedula"
                      value={studyForm.medicoSolicitaCedula}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder={currentUser?.cedula_profesional || clinicConfig?.cedula_profesional || "Cedula profesional"}
                    />
                  </div>

                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Interpretacion del medico</label>
                    <textarea
                      name="interpretacion"
                      value={studyForm.interpretacion}
                      onChange={updateStudyForm}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-24 resize-none"
                      placeholder="Interpretacion clinica inicial o comentario del medico solicitante..."
                    />
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
                          {study.problemaClinico ? (
                            <p className="text-xs text-slate-500 font-bold mt-1 truncate">
                              Motivo clinico: {study.problemaClinico}
                            </p>
                          ) : null}
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
                  <input
                    name="pacienteNombre"
                    value={consentForm.pacienteNombre}
                    onChange={updateConsentForm}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">Fecha y hora</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{consultationDateLabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Lugar de emision</label>
                  <input
                    name="lugarEmision"
                    value={consentForm.lugarEmision}
                    onChange={updateConsentForm}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Titulo del documento</label>
                  <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700">
                    Consentimiento informado clinico
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Descripcion del acto medico</label>
                <textarea
                  name="actoMedico"
                  value={consentForm.actoMedico}
                  onChange={updateConsentForm}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-28 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Riesgos generales</label>
                <textarea
                  name="riesgosGenerales"
                  value={consentForm.riesgosGenerales}
                  onChange={updateConsentForm}
                  className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-300 font-bold text-amber-900 min-h-24 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Beneficios esperados del acto medico</label>
                <textarea
                  name="beneficiosEsperados"
                  value={consentForm.beneficiosEsperados}
                  onChange={updateConsentForm}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-24 resize-none"
                  placeholder="Ej: Valoracion oportuna, integracion diagnostica, definicion de tratamiento y seguimiento medico."
                />
              </div>

              <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
                <p className="text-[10px] font-black uppercase text-teal-600">Medico responsable</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Nombre completo</label>
                    <input
                      name="medicoNombre"
                      value={consentForm.medicoNombre}
                      onChange={updateConsentForm}
                      className="w-full p-3 bg-white border border-teal-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Cedula profesional</label>
                    <input
                      name="medicoCedula"
                      value={consentForm.medicoCedula}
                      onChange={updateConsentForm}
                      className="w-full p-3 bg-white border border-teal-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-3">
                  {clinicConfig?.nombre_consultorio || "Consultorio MyCliniq"}
                </p>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  name="autorizacionContingencias"
                  type="checkbox"
                  checked={consentForm.autorizacionContingencias}
                  onChange={updateConsentForm}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-slate-600 leading-relaxed">
                  Autorizo al personal de salud para atencion de contingencias y urgencias derivadas del acto autorizado.
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Firma del paciente</label>
                  <input
                    name="pacienteFirma"
                    value={consentForm.pacienteFirma}
                    onChange={updateConsentForm}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    placeholder="El paciente firma de conformidad"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Firma del medico</label>
                  <input
                    name="medicoFirma"
                    value={consentForm.medicoFirma}
                    onChange={updateConsentForm}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                    placeholder="Nombre completo como firma escrita"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  name="aceptado"
                  type="checkbox"
                  checked={consentForm.aceptado}
                  onChange={updateConsentForm}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-slate-600 leading-relaxed">
                  Confirmo que el paciente recibio informacion suficiente, acepta el acto medico descrito y autorizo
                  registrar este consentimiento junto con la consulta.
                </span>
              </label>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
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
                  onClick={openPrintableConsent}
                  className="px-6 py-3 rounded-2xl font-black border border-slate-200 text-slate-700 hover:bg-white"
                  disabled={isSaving}
                >
                  Imprimir consentimiento
                </button>
              </div>
              <button
                type="button"
                onClick={confirmClinicalConsent}
                disabled={
                  isSaving ||
                  !consentForm.aceptado ||
                  !consentForm.lugarEmision.trim() ||
                  !consentForm.actoMedico.trim() ||
                  !consentForm.beneficiosEsperados.trim() ||
                  !consentForm.autorizacionContingencias ||
                  !consentForm.pacienteNombre.trim() ||
                  !consentForm.pacienteFirma.trim() ||
                  !consentForm.medicoNombre.trim() ||
                  !consentForm.medicoCedula.trim() ||
                  !consentForm.medicoFirma.trim()
                }
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
