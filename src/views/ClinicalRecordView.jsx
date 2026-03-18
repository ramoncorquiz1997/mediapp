import React, { useEffect, useState } from "react";
import {
  Plus,
  User,
  Activity,
  CalendarDays,
  Pill,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Stethoscope,
  NotebookText,
  Pencil,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Link2,
  MessageCircleMore,
} from "lucide-react";

import { apiFetch } from "../lib/api";

const clinicInfo = {
  nombre_consultorio: "Consultorio MyCliniq",
  direccion: "Tijuana, Baja California",
  telefono: "664 000 0000",
  email_contacto: "doctora@MyCliniq.lat",
  cedula_profesional: "12345678",
};

const antecedentCategories = [
  "Heredofamiliares",
  "Patologicos",
  "Quirurgicos",
  "Alergicos",
  "Gineco-obstetricos",
  "No patologicos",
];

const getVisibleAntecedentCategories = (sexo) =>
  antecedentCategories.filter((category) => category !== "Gineco-obstetricos" || sexo === "Femenino");

const parseHabitsAntecedent = (descripcion) => {
  try {
    const parsed = JSON.parse(String(descripcion || "{}"));
    const parts = [
      `Tabaco: ${parsed.tabacoEstado || "Nunca"}${parsed.tabacoCantidadDiaria ? `, ${parsed.tabacoCantidadDiaria}` : ""}${parsed.tabacoAnios ? `, ${parsed.tabacoAnios} anios` : ""}`,
      `Alcohol: ${parsed.alcoholEstado || "Nunca"}${parsed.alcoholTipo ? `, ${parsed.alcoholTipo}` : ""}${parsed.alcoholCantidad ? `, ${parsed.alcoholCantidad}` : ""}`,
      `Otras sustancias: ${parsed.otrasSustancias || "Sin registro"}`,
    ];
    return parts.join("\n");
  } catch {
    return String(descripcion || "");
  }
};

const formatLastVisit = (value) => {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const formatConsultationDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
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
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const normalizeWhatsAppPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  return digits;
};

const buildExplorationSections = (entry) => {
  const sections = [
    {
      key: "habitus_exterior",
      label: "Habitus exterior",
      value: entry.habitus_exterior || "",
    },
    { key: "exploracion_cabeza", label: "Cabeza", value: entry.exploracion_cabeza || "" },
    { key: "exploracion_cuello", label: "Cuello", value: entry.exploracion_cuello || "" },
    { key: "exploracion_torax", label: "Torax", value: entry.exploracion_torax || "" },
    { key: "exploracion_abdomen", label: "Abdomen", value: entry.exploracion_abdomen || "" },
    { key: "exploracion_extremidades", label: "Extremidades", value: entry.exploracion_extremidades || "" },
    { key: "exploracion_genitales", label: "Genitales", value: entry.exploracion_genitales || "" },
  ];

  return sections.filter((section) => String(section.value || "").trim());
};

function RecordActionButton({ icon: Icon, label, onClick, disabled = false, title, variant = "neutral" }) {
  const variantStyles = {
    neutral:
      "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    teal:
      "border-teal-100 bg-teal-50 text-teal-800 hover:border-teal-200 hover:bg-teal-100",
    danger:
      "border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:bg-red-100",
    success:
      "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100",
    primary:
      "border-teal-600 bg-teal-600 text-white shadow-lg shadow-teal-100 hover:bg-teal-700 hover:border-teal-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]}`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function DeletePatientModal({ open, patient, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  if (!open || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <p className="text-lg font-black text-slate-800">Dar de baja paciente</p>
          <p className="text-sm text-slate-500 font-bold mt-1">
            Seguro que deseas dar de baja al paciente {patient.nombre}?
          </p>
          <div className="mt-4 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Motivo de baja</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-24 resize-none"
              placeholder="Ej: Paciente ya no continuara seguimiento, expediente inactivo..."
            />
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-700">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            className="px-8 py-3 rounded-2xl font-black bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
          >
            Dar de baja
          </button>
        </div>
      </div>
    </div>
  );
}

const ConsultationSection = ({ title, children }) => (
  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{title}</p>
    {children}
  </div>
);

export default function ClinicalRecordView({
  patient,
  consultationHistory,
  isLoading,
  error,
  clinicConfig,
  focusedConsultationId,
  onConsultationFocusHandled,
  onNewConsultation,
  onEditConsultation,
  onRepeatPrescription,
  onRefreshConsultations,
  onDeletePatient,
  onReactivatePatient,
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportingPrescriptionId, setExportingPrescriptionId] = useState(null);
  const [antecedentes, setAntecedentes] = useState([]);
  const [antecedentesLoading, setAntecedentesLoading] = useState(false);
  const [antecedentesError, setAntecedentesError] = useState("");
  const [antecedenteForm, setAntecedenteForm] = useState({ tipo: "Heredofamiliares", descripcion: "" });
  const [isSavingAntecedente, setIsSavingAntecedente] = useState(false);
  const [habitsText, setHabitsText] = useState("");
  const [editingAntecedenteId, setEditingAntecedenteId] = useState(null);
  const [editingAntecedenteForm, setEditingAntecedenteForm] = useState({
    tipo: "Heredofamiliares",
    descripcion: "",
  });
  const [isAntecedentsCollapsed, setIsAntecedentsCollapsed] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ from: "", to: "", diagnosis: "", type: "Todos" });
  const [expandedConsultationId, setExpandedConsultationId] = useState(null);
  const [studyDrafts, setStudyDrafts] = useState({});
  const [updatingStudyId, setUpdatingStudyId] = useState(null);
  const [portalFeedback, setPortalFeedback] = useState("");
  const resolvedClinicInfo = {
    ...clinicInfo,
    ...(clinicConfig || {}),
  };
  const patientPortalUrl =
    patient?.portal_token && typeof window !== "undefined"
      ? `${window.location.origin}/p/${patient.portal_token}`
      : "";

  useEffect(() => {
    const visibleCategories = getVisibleAntecedentCategories(patient?.sexo);
    setAntecedenteForm((prev) =>
      visibleCategories.includes(prev.tipo) ? prev : { ...prev, tipo: visibleCategories[0] || "Heredofamiliares" }
    );
  }, [patient?.sexo]);

  useEffect(() => {
    const habitsAntecedente = antecedentes.find((item) => item.tipo === "Habitos");
    setHabitsText(habitsAntecedente ? parseHabitsAntecedent(habitsAntecedente.descripcion) : "");
  }, [antecedentes]);

  useEffect(() => {
    const loadAntecedentes = async () => {
      if (!patient?.id) {
        setAntecedentes([]);
        return;
      }

      try {
        setAntecedentesLoading(true);
        setAntecedentesError("");
        const response = await apiFetch(`/api/pacientes/${patient.id}/antecedentes`);
        if (!response.ok) throw new Error(`No se pudieron cargar antecedentes (${response.status})`);
        setAntecedentes(await response.json());
      } catch (loadError) {
        setAntecedentesError(loadError.message || "No se pudieron cargar antecedentes");
      } finally {
        setAntecedentesLoading(false);
      }
    };

    loadAntecedentes();
  }, [patient?.id]);

  useEffect(() => {
    setExpandedConsultationId(null);
    setHistoryFilters({ from: "", to: "", diagnosis: "", type: "Todos" });
  }, [patient?.id, consultationHistory]);

  useEffect(() => {
    if (!focusedConsultationId) return;
    if (!consultationHistory.some((entry) => entry.id === focusedConsultationId)) return;

    setExpandedConsultationId(focusedConsultationId);
    onConsultationFocusHandled?.();
  }, [focusedConsultationId, consultationHistory, onConsultationFocusHandled]);

  useEffect(() => {
    if (!portalFeedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPortalFeedback("");
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [portalFeedback]);

  if (!patient) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm text-slate-500 font-bold">
        Selecciona un paciente desde la lista para abrir su expediente.
      </div>
    );
  }

  const resolvedAge = patient.edad ?? calculateAge(patient.fecha_nacimiento);
  const visibleAntecedentCategories = getVisibleAntecedentCategories(patient.sexo);
  const habitsAntecedente = antecedentes.find((item) => item.tipo === "Habitos") || null;
  const antecedentesByCategory = visibleAntecedentCategories.reduce((acc, category) => {
    acc[category] = antecedentes.filter((item) => item.tipo === category);
    return acc;
  }, {});
  const consultationTypeOptions = Array.from(
    new Set(consultationHistory.map((entry) => String(entry.motivo || "").trim()).filter(Boolean))
  );
  const pendingStudies = consultationHistory.flatMap((entry) =>
    (entry.estudios || [])
      .filter((study) => study.estado !== "Revisado por el medico")
      .map((study) => ({
        ...study,
        consultationId: entry.id,
        consultationDate: entry.fecha,
      }))
  );
  const filteredConsultationHistory = consultationHistory.filter((entry) => {
    const consultationDate = entry.fecha ? new Date(entry.fecha) : null;
    const diagnosisText = `${entry.cie10_codigo || ""} ${entry.cie10_descripcion || ""} ${entry.diagnostico || ""}`.toLowerCase();
    const matchesFrom =
      !historyFilters.from ||
      (consultationDate && !Number.isNaN(consultationDate.getTime())
        ? consultationDate >= new Date(`${historyFilters.from}T00:00:00`)
        : false);
    const matchesTo =
      !historyFilters.to ||
      (consultationDate && !Number.isNaN(consultationDate.getTime())
        ? consultationDate <= new Date(`${historyFilters.to}T23:59:59`)
        : false);
    const matchesDiagnosis =
      !historyFilters.diagnosis || diagnosisText.includes(historyFilters.diagnosis.trim().toLowerCase());
    const matchesType =
      historyFilters.type === "Todos" || String(entry.motivo || "").trim() === historyFilters.type;
    return matchesFrom && matchesTo && matchesDiagnosis && matchesType;
  });

  const saveAntecedente = async () => {
    if (!antecedenteForm.descripcion.trim()) return;
    try {
      setIsSavingAntecedente(true);
      setAntecedentesError("");
      const response = await apiFetch(`/api/pacientes/${patient.id}/antecedentes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: antecedenteForm.tipo,
          descripcion: antecedenteForm.descripcion.trim(),
        }),
      });
      if (!response.ok) throw new Error(`No se pudo guardar antecedente (${response.status})`);
      const created = await response.json();
      setAntecedentes((prev) => [created, ...prev]);
      setAntecedenteForm({
        tipo: getVisibleAntecedentCategories(patient?.sexo)[0] || "Heredofamiliares",
        descripcion: "",
      });
    } catch (saveError) {
      setAntecedentesError(saveError.message || "No se pudo guardar antecedente");
    } finally {
      setIsSavingAntecedente(false);
    }
  };

  const deleteAntecedente = async (antecedenteId) => {
    try {
      setAntecedentesError("");
      const response = await apiFetch(`/api/antecedentes/${antecedenteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`No se pudo eliminar antecedente (${response.status})`);
      setAntecedentes((prev) => prev.filter((item) => item.id !== antecedenteId));
    } catch (deleteError) {
      setAntecedentesError(deleteError.message || "No se pudo eliminar antecedente");
    }
  };

  const startEditingAntecedente = (antecedente) => {
    setEditingAntecedenteId(antecedente.id);
    setEditingAntecedenteForm({
      tipo: antecedente.tipo,
      descripcion: antecedente.descripcion,
    });
  };

  const saveAntecedenteChanges = async () => {
    if (!editingAntecedenteId || !editingAntecedenteForm.descripcion.trim()) return;

    try {
      setIsSavingAntecedente(true);
      setAntecedentesError("");
      const response = await apiFetch(`/api/antecedentes/${editingAntecedenteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: editingAntecedenteForm.tipo,
          descripcion: editingAntecedenteForm.descripcion.trim(),
        }),
      });

      if (!response.ok) throw new Error(`No se pudo actualizar antecedente (${response.status})`);

      const updated = await response.json();
      setAntecedentes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingAntecedenteId(null);
      setEditingAntecedenteForm({
        tipo: getVisibleAntecedentCategories(patient?.sexo)[0] || "Heredofamiliares",
        descripcion: "",
      });
    } catch (saveError) {
      setAntecedentesError(saveError.message || "No se pudo actualizar antecedente");
    } finally {
      setIsSavingAntecedente(false);
    }
  };

  const saveHabitsAntecedente = async () => {
    try {
      setIsSavingAntecedente(true);
      setAntecedentesError("");

        const payload = {
          tipo: "Habitos",
          descripcion: habitsText.trim(),
        };

      const response = await apiFetch(
        habitsAntecedente ? `/api/antecedentes/${habitsAntecedente.id}` : `/api/pacientes/${patient.id}/antecedentes`,
        {
          method: habitsAntecedente ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `${habitsAntecedente ? "No se pudo actualizar" : "No se pudo guardar"} habitos (${response.status})`
        );
      }

      const saved = await response.json();
      setAntecedentes((prev) => {
        if (habitsAntecedente) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });
    } catch (saveError) {
      setAntecedentesError(saveError.message || "No se pudieron guardar los habitos");
    } finally {
      setIsSavingAntecedente(false);
    }
  };

  const exportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const response = await apiFetch(`/api/pacientes/${patient.id}/expediente-pdf`);
      if (!response.ok) throw new Error(`No se pudo exportar PDF (${response.status})`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expediente-${patient.external_id || patient.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setAntecedentesError(exportError.message || "No se pudo exportar el expediente");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const reactivatePatient = async () => {
    const restored = await onReactivatePatient(patient);
    if (!restored) setAntecedentesError("No se pudo reactivar el paciente");
  };

  const getStudyDraft = (study) =>
    studyDrafts[study.id] || {
      estado: study.estado || "Solicitado",
      resultado: study.resultado || "",
      interpretacion: study.interpretacion || "",
      fecha_estudio: study.fecha_estudio
        ? new Date(study.fecha_estudio).toISOString().slice(0, 16)
        : "",
      problema_clinico: study.problema_clinico || "",
    };

  const updateStudyDraft = (studyId, changes) => {
    setStudyDrafts((prev) => ({
      ...prev,
      [studyId]: {
        ...(prev[studyId] || {}),
        ...changes,
      },
    }));
  };

  const saveStudyStatus = async (study) => {
    const draft = getStudyDraft(study);

    try {
      setUpdatingStudyId(study.id);
      setAntecedentesError("");

      const response = await apiFetch(`/api/estudios/${study.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: draft.estado,
          resultado: draft.resultado || "",
          interpretacion: draft.interpretacion || "",
          fecha_estudio: draft.fecha_estudio || "",
          problema_clinico: draft.problema_clinico || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo actualizar estudio (${response.status})`);
      }

      await response.json();
      await onRefreshConsultations?.();
    } catch (saveError) {
      setAntecedentesError(saveError.message || "No se pudo actualizar el estudio");
    } finally {
      setUpdatingStudyId(null);
    }
  };

  const printPrescription = (entry) => {
    const age = patient.edad ?? calculateAge(patient.fecha_nacimiento) ?? "N/D";
    const folio = `REC-${patient.external_id || patient.id}-${entry.id}`;
    const diagnosis = entry.cie10_codigo
      ? `${entry.cie10_codigo} - ${entry.cie10_descripcion || entry.diagnostico || "Sin diagnostico"}`
      : entry.diagnostico || "Sin diagnostico";
    const prognosis = entry.pronostico || "Sin pronostico";
    const medications = (entry.recetas || [])
      .map(
        (item) => `
          <tr>
            <td>${item.medicamento || ""}</td>
            <td>${item.dosis || "Sin dosis"}</td>
            <td>${item.via_administracion || "Sin via especificada"}</td>
            <td>${
              item.frecuencia_cantidad
                ? `Cada ${item.frecuencia_cantidad} ${String(item.frecuencia_unidad || "").toLowerCase()}`
                : "Sin pauta"
            }</td>
            <td>${
              item.duracion_cantidad
                ? `${item.duracion_cantidad} ${String(item.duracion_unidad || "").toLowerCase()}`
                : "Sin definir"
            }</td>
          </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receta ${folio}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 28px; font-weight: 800; color: #0f766e; margin: 0; }
            .meta { color: #475569; font-size: 13px; font-weight: 700; line-height: 1.6; }
            .section { margin-top: 24px; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; font-weight: 800; margin-bottom: 8px; }
            .patient-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
            .card strong { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 14px; }
            th { color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
            .signature { margin-top: 48px; padding-top: 24px; }
            .signature-line { border-top: 1px solid #94a3b8; width: 280px; padding-top: 10px; font-weight: 700; color: #334155; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; color: #64748b; font-size: 12px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            ${resolvedClinicInfo.logo_data_url ? `<img src="${resolvedClinicInfo.logo_data_url}" alt="Logo" style="width:56px;height:56px;object-fit:cover;border-radius:14px;margin-bottom:12px;" />` : ""}
            <p class="title">${resolvedClinicInfo.nombre_consultorio || "Consultorio MyCliniq"}</p>
            <div class="meta">
              <div>${resolvedClinicInfo.direccion || ""}</div>
              <div>Telefono: ${resolvedClinicInfo.telefono || ""}</div>
              <div>Medico: ${entry.medico_nombre || "Sin medico"} | Cedula: ${entry.medico_cedula || resolvedClinicInfo.cedula_profesional || "Sin registro"}</div>
            </div>
          </div>
          <div class="section">
            <div class="patient-grid">
              <div class="card"><strong>Paciente</strong>${patient.nombre}</div>
              <div class="card"><strong>Edad</strong>${age} años</div>
              <div class="card"><strong>Fecha</strong>${formatDateTime(entry.fecha)}</div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Diagnostico CIE-10</div>
            <div class="card">${diagnosis}</div>
          </div>
          <div class="section">
            <div class="section-title">Pronostico</div>
            <div class="card">${prognosis}</div>
          </div>
          <div class="section">
            <div class="section-title">Medicamentos</div>
            <table>
              <thead><tr><th>Medicamento</th><th>Dosis</th><th>Via</th><th>Frecuencia</th><th>Duracion</th></tr></thead>
              <tbody>${medications || '<tr><td colspan="5">Sin medicamentos registrados</td></tr>'}</tbody>
            </table>
          </div>
          <div class="signature"><div class="signature-line">Firma del medico</div></div>
          <div class="footer"><span>Emitida: ${formatDateTime(new Date().toISOString())}</span><span>Folio: ${folio}</span></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadPrescriptionPdf = async (entry) => {
    try {
      setExportingPrescriptionId(entry.id);
      const response = await apiFetch(`/api/consultas/${entry.id}/receta-pdf`);
      if (!response.ok) throw new Error(`No se pudo descargar receta (${response.status})`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receta-${patient.external_id || patient.id}-${entry.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setAntecedentesError(downloadError.message || "No se pudo descargar la receta");
    } finally {
      setExportingPrescriptionId(null);
    }
  };

  const copyPatientPortalLink = async () => {
    if (!patientPortalUrl) {
      setPortalFeedback("Este paciente aun no tiene link de portal disponible");
      return;
    }

    try {
      await navigator.clipboard.writeText(patientPortalUrl);
      setPortalFeedback("Link del paciente copiado al portapapeles");
    } catch {
      setPortalFeedback("No se pudo copiar el link del paciente");
    }
  };

  const sendPortalLinkByWhatsApp = () => {
    if (!patientPortalUrl) {
      setPortalFeedback("Este paciente aun no tiene link de portal disponible");
      return;
    }

    const phone = normalizeWhatsAppPhone(patient?.telefono);
    if (!phone) {
      setPortalFeedback("Este paciente no tiene telefono registrado");
      return;
    }

    const message = `Hola, aqui esta tu link de acceso a tu expediente: ${patientPortalUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,#dbeafe_0%,#eff6ff_45%,#f8fafc_100%)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-300">
                <User size={64} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-xl text-white border-4 border-white">
                <Activity size={20} />
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-slate-800">{patient.nombre}</h3>
                  <p className="text-slate-500 font-medium">
                    Expediente:{" "}
                    <span className="text-teal-600 font-bold">{patient.external_id || `DB-${patient.id}`}</span>{" "}
                    • {patient.sexo || "Sexo N/D"} • {resolvedAge ?? "Edad N/D"} años
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:max-w-[780px] lg:justify-end">
                  <RecordActionButton
                    icon={Link2}
                    label="Copiar link"
                    onClick={copyPatientPortalLink}
                    variant="teal"
                  />
                  <RecordActionButton
                    icon={MessageCircleMore}
                    label="Enviar por WhatsApp"
                    onClick={sendPortalLinkByWhatsApp}
                    disabled={!normalizeWhatsAppPhone(patient?.telefono)}
                    title={!normalizeWhatsAppPhone(patient?.telefono) ? "Falta telefono del paciente" : "Enviar link por WhatsApp"}
                    variant="neutral"
                  />
                  <RecordActionButton
                    icon={NotebookText}
                    label={isExportingPdf ? "Exportando PDF..." : "Exportar PDF"}
                    onClick={exportPdf}
                    disabled={isExportingPdf}
                    variant="teal"
                  />
                  {patient.dado_de_baja ? (
                    <RecordActionButton
                      icon={Activity}
                      label="Reactivar paciente"
                      onClick={reactivatePatient}
                      variant="success"
                    />
                  ) : (
                    <RecordActionButton
                      icon={Trash2}
                      label="Dar de baja"
                      onClick={() => setIsDeleteModalOpen(true)}
                      variant="danger"
                    />
                  )}
                  <RecordActionButton
                    icon={Plus}
                    label="Nueva consulta"
                    onClick={onNewConsultation}
                    variant="primary"
                  />
                </div>
              </div>

              {portalFeedback ? (
                <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
                  <p className="text-sm font-bold text-teal-700">{portalFeedback}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tipo sangre</p>
                  <p className="text-slate-700 font-bold text-lg">{patient.tipo_sangre || "N/D"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Ultima visita</p>
                  <p className="text-slate-700 font-bold text-lg">{formatLastVisit(patient.ultima_visita)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-red-400 font-bold uppercase">Alergias</p>
                  <p className="text-red-700 font-bold text-sm">{patient.alergias_resumen || "Sin registro"}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-2xl">
                  <p className="text-[10px] text-teal-400 font-bold uppercase">Estado</p>
                  <p className={`font-bold text-lg ${patient.dado_de_baja ? "text-red-700" : "text-teal-700"}`}>
                    {patient.dado_de_baja ? "Dado de baja" : patient.activo ? "Activo" : "Inactivo"}
                  </p>
                </div>
              </div>

              {patient.dado_de_baja ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase text-red-500">Baja del expediente</p>
                  <p className="text-sm font-bold text-red-700 mt-1">
                    Fecha: {formatLastVisit(patient.fecha_baja)} | Motivo: {patient.motivo_baja || "Sin motivo registrado"}
                  </p>
                  <p className="text-xs font-bold text-red-500 mt-2">
                    Conservacion minima hasta: {formatLastVisit(patient.fecha_minima_conservacion)}
                  </p>
                </div>
              ) : null}

              {pendingStudies.length ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-[10px] font-black uppercase text-amber-600">
                      Estudios pendientes de revision
                    </p>
                  </div>
                  <p className="text-sm font-bold text-amber-800 mt-2">
                    {pendingStudies.length} estudio{pendingStudies.length === 1 ? "" : "s"} pendiente
                    {pendingStudies.length === 1 ? "" : "s"} en el expediente.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-start gap-3">
                  <Phone size={16} className="text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Telefono</p>
                    <p className="text-sm font-bold text-slate-700">{patient.telefono || "Sin registro"}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-start gap-3">
                  <Mail size={16} className="text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Email</p>
                    <p className="text-sm font-bold text-slate-700 break-all">{patient.email || "Sin registro"}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-start gap-3">
                  <MapPin size={16} className="text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Direccion</p>
                    <p className="text-sm font-bold text-slate-700">{patient.direccion || "Sin registro"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <button
                type="button"
                onClick={() => setIsAntecedentsCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 text-left mb-5"
              >
                <h4 className="font-black text-slate-800 text-lg flex items-center">
                  <ShieldAlert size={20} className="mr-2 text-teal-600" /> Antecedentes medicos
                </h4>
                <div className="p-2 rounded-2xl bg-slate-50 text-teal-700">
                  {isAntecedentsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </button>

              {!isAntecedentsCollapsed ? (
              <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                  <select
                    value={antecedenteForm.tipo}
                    onChange={(e) => setAntecedenteForm((prev) => ({ ...prev, tipo: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  >
                    {visibleAntecedentCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Descripcion</label>
                  <div className="flex gap-3">
                    <input
                      value={antecedenteForm.descripcion}
                      onChange={(e) => setAntecedenteForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                      placeholder="Ej: Apendicectomia, HTA, alergia a penicilina..."
                    />
                    <button
                      type="button"
                      onClick={saveAntecedente}
                      disabled={isSavingAntecedente}
                      className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-60"
                    >
                      {isSavingAntecedente ? "Guardando..." : "Agregar"}
                    </button>
                  </div>
                </div>
              </div>

              {antecedentesError ? (
                <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">
                  {antecedentesError}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {antecedentesLoading ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-500">
                    Cargando antecedentes...
                  </div>
                  ) : (
                    <>
                      {antecedentes.filter((item) => item.tipo !== "Habitos").length === 0 && !habitsAntecedente ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-500">
                          Aun no hay antecedentes registrados. Puedes empezar capturando antecedentes clinicos o habitos.
                        </div>
                      ) : null}
                      {visibleAntecedentCategories.map((category) => (
                        <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase text-teal-600">{category}</p>
                          <div className="mt-3 space-y-3">
                            {antecedentesByCategory[category]?.length ? (
                              antecedentesByCategory[category].map((antecedente) => (
                                <div
                                  key={antecedente.id}
                                  className="rounded-2xl bg-white border border-slate-100 p-4"
                                >
                                  {editingAntecedenteId === antecedente.id ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-4">
                                          <select
                                            value={editingAntecedenteForm.tipo}
                                            onChange={(e) =>
                                              setEditingAntecedenteForm((prev) => ({
                                                ...prev,
                                                tipo: e.target.value,
                                              }))
                                            }
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                          >
                                            {visibleAntecedentCategories.map((option) => (
                                              <option key={option} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="md:col-span-8">
                                          <input
                                            value={editingAntecedenteForm.descripcion}
                                            onChange={(e) =>
                                              setEditingAntecedenteForm((prev) => ({
                                                ...prev,
                                                descripcion: e.target.value,
                                              }))
                                            }
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingAntecedenteId(null)}
                                          className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={saveAntecedenteChanges}
                                          disabled={isSavingAntecedente}
                                          className="px-4 py-2 rounded-2xl bg-teal-600 text-white font-black text-sm hover:bg-teal-700 transition-colors disabled:opacity-60"
                                        >
                                          {isSavingAntecedente ? "Guardando..." : "Guardar"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="text-sm font-bold text-slate-700">{antecedente.descripcion}</p>
                                        {antecedente.updated_at && antecedente.updated_at !== antecedente.created_at ? (
                                          <p className="text-[11px] font-black text-amber-600 mt-2">
                                            Editado el {formatDateTime(antecedente.updated_at)}
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => startEditingAntecedente(antecedente)}
                                          className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-50 transition-all"
                                          title="Editar antecedente"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteAntecedente(antecedente.id)}
                                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-all"
                                          title="Eliminar antecedente"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-sm font-bold text-slate-400">
                                Sin registro en esta categoria.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div>
                          <p className="text-xs font-black uppercase text-teal-600">Habitos</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            Texto libre para tabaco, alcohol y otras sustancias.
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={saveHabitsAntecedente}
                            disabled={isSavingAntecedente}
                            className="px-4 py-2 rounded-2xl bg-teal-600 text-white font-black text-sm hover:bg-teal-700 disabled:opacity-60"
                          >
                            {isSavingAntecedente ? "Guardando..." : habitsAntecedente ? "Actualizar" : "Guardar"}
                          </button>
                        </div>

                        <div className="mt-4 space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-500">Descripcion</label>
                          <textarea
                            value={habitsText}
                            onChange={(e) => setHabitsText(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-28 resize-none"
                            placeholder="Ej: Tabaco: niega. Alcohol: ocasional, 2 cervezas por fin de semana. Otras sustancias: niega."
                          />
                        </div>

                        <div className="mt-4 rounded-2xl bg-white border border-slate-100 p-4">
                          <p className="text-[10px] font-black uppercase text-slate-400">Vista previa</p>
                          <p className="text-sm font-bold text-slate-700 mt-2 whitespace-pre-wrap">
                            {habitsText || "Sin registro"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                </>
              ) : null}
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-slate-800 text-lg flex items-center px-2">
                <CalendarDays size={20} className="mr-2 text-teal-600" /> Historial de consultas
              </h4>

              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <input type="date" value={historyFilters.from} onChange={(e) => setHistoryFilters((prev) => ({ ...prev, from: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700" />
                  <input type="date" value={historyFilters.to} onChange={(e) => setHistoryFilters((prev) => ({ ...prev, to: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700" />
                  <input type="text" value={historyFilters.diagnosis} onChange={(e) => setHistoryFilters((prev) => ({ ...prev, diagnosis: e.target.value }))} placeholder="Buscar diagnostico" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700" />
                  <select value={historyFilters.type} onChange={(e) => setHistoryFilters((prev) => ({ ...prev, type: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700">
                    <option value="Todos">Todos</option>
                    {consultationTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="px-3 py-2 rounded-2xl bg-teal-50 text-teal-700 text-xs font-black">
                    {filteredConsultationHistory.length} consulta
                    {filteredConsultationHistory.length === 1 ? "" : "s"} encontrada
                    {filteredConsultationHistory.length === 1 ? "" : "s"}
                  </span>
                  <button type="button" onClick={() => setHistoryFilters({ from: "", to: "", diagnosis: "", type: "Todos" })} className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 transition-colors">
                    Limpiar filtros
                  </button>
                </div>
              </div>

              {error ? <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-sm font-bold text-red-600">{error}</div> : null}

              {isLoading ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-sm font-bold text-slate-500">Cargando consultas...</div>
              ) : consultationHistory.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-sm font-bold text-slate-500">Este paciente aun no tiene consultas registradas.</div>
              ) : filteredConsultationHistory.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-sm font-bold text-slate-500">Ninguna consulta coincide con los filtros seleccionados.</div>
              ) : (
                filteredConsultationHistory.map((entry) => {
                  const isExpanded = expandedConsultationId === entry.id;
                  const diagnosisText = entry.cie10_codigo ? `${entry.cie10_codigo} - ${entry.cie10_descripcion || entry.diagnostico}` : entry.diagnostico || "Sin diagnostico";
                  const explorationSections = buildExplorationSections(entry);
                  const snapshotName = entry.paciente_nombre_snapshot || patient.nombre || "Sin nombre";
                  const snapshotAge = entry.paciente_edad_snapshot ?? patient.edad ?? calculateAge(patient.fecha_nacimiento) ?? "Sin edad";
                  const snapshotSex = entry.paciente_sexo_snapshot || patient.sexo || "Sin sexo";
                  return (
                    <div key={entry.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-teal-200 transition-all">
                      <button type="button" onClick={() => setExpandedConsultationId((prev) => (prev === entry.id ? null : entry.id))} className="w-full text-left">
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{formatConsultationDate(entry.fecha)}</span>
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{entry.motivo || "Consulta general"}</span>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800">{diagnosisText}</h5>
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2"><Stethoscope size={14} className="text-teal-600" />{entry.medico_nombre || "Medico sin registrar"}</p>
                            {entry.updated_at && entry.created_at && entry.updated_at !== entry.created_at ? <p className="text-[11px] font-black text-amber-600">Editado el {formatDateTime(entry.updated_at)}</p> : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="hidden md:inline-flex px-3 py-2 rounded-2xl bg-slate-50 text-slate-500 text-xs font-black">Tension arterial (TA): {entry.signos?.ta || "N/A"}</span>
                            <span className="hidden md:inline-flex px-3 py-2 rounded-2xl bg-slate-50 text-slate-500 text-xs font-black">Peso: {entry.signos?.peso || "N/A"}</span>
                            <div className="p-2 rounded-2xl bg-slate-50 text-teal-700">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => printPrescription(entry)} className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-sm hover:border-teal-200 hover:bg-teal-50 transition-colors inline-flex items-center gap-2"><Printer size={16} /><span>Imprimir receta</span></button>
                            <button type="button" onClick={() => downloadPrescriptionPdf(entry)} disabled={exportingPrescriptionId === entry.id} className="px-4 py-2 rounded-2xl bg-slate-50 text-teal-700 font-black text-sm hover:bg-teal-50 transition-colors inline-flex items-center gap-2 disabled:opacity-60"><Download size={16} /><span>{exportingPrescriptionId === entry.id ? "Descargando..." : "Descargar PDF"}</span></button>
                            <button type="button" onClick={() => onEditConsultation(entry)} className="px-4 py-2 rounded-2xl bg-slate-50 text-teal-700 font-black text-sm hover:bg-teal-50 transition-colors inline-flex items-center gap-2"><Pencil size={16} /><span>Editar</span></button>
                            <button type="button" onClick={() => onRepeatPrescription(entry)} className="px-4 py-2 rounded-2xl bg-teal-50 text-teal-700 font-black text-sm hover:bg-teal-100 transition-colors inline-flex items-center gap-2"><ClipboardPlus size={16} /><span>Repetir receta</span></button>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <ConsultationSection title="Contexto del paciente">
                              <div className="space-y-2 text-sm font-bold text-slate-700">
                                <p>Nombre: {snapshotName}</p>
                                <p>Edad: {snapshotAge}</p>
                                <p>Sexo: {snapshotSex}</p>
                              </div>
                            </ConsultationSection>
                            <ConsultationSection title="Signos vitales"><div className="space-y-2 text-sm font-bold text-slate-700"><p>Tension arterial (TA): {entry.signos?.ta || "N/A"}</p><p>Peso: {entry.signos?.peso || "N/A"}</p><p>Temperatura (Temp): {entry.signos?.temp || "N/A"}</p><p>Talla: {entry.signos?.talla || "N/A"}</p><p>Glucosa: {entry.signos?.glucosa || "N/A"}</p><p>Frecuencia cardiaca (FC): {entry.signos?.frecuenciaCardiaca || "N/A"}</p><p>Frecuencia respiratoria (FR): {entry.signos?.frecuenciaRespiratoria || "N/A"}</p></div></ConsultationSection>
                            <ConsultationSection title="Exploracion fisica">
                              {entry.descripcion_fisica ? (
                                <p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.descripcion_fisica}</p>
                              ) : explorationSections.length ? (
                                <div className="space-y-3">
                                  {explorationSections.map((section) => (
                                    <div key={section.key}>
                                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{section.label}</p>
                                      <p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{section.value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">Sin exploracion registrada</p>
                              )}
                            </ConsultationSection>
                            <ConsultationSection title="Diagnostico CIE-10"><p className="text-sm text-slate-700 font-bold">{diagnosisText}</p></ConsultationSection>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <ConsultationSection title="Padecimiento actual"><p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.padecimiento_actual || "Sin padecimiento actual registrado"}</p></ConsultationSection>
                            <ConsultationSection title="Interrogatorio por aparatos y sistemas"><p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.interrogatorio_aparatos_sistemas || "Sin interrogatorio registrado"}</p></ConsultationSection>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <ConsultationSection title="Pronostico"><p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.pronostico || "Sin pronostico registrado"}</p></ConsultationSection>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
                            <ConsultationSection title="Plan de tratamiento"><p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.plan_tratamiento || "Sin plan de tratamiento"}</p></ConsultationSection>
                          </div>

                          <ConsultationSection title="Receta">
                            {(entry.recetas ?? []).length ? entry.recetas.map((item) => (
                              <div key={item.id} className="rounded-2xl bg-white border border-slate-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                                <div><p className="text-sm font-black text-slate-800">{item.medicamento} {item.dosis || ""}</p><p className="text-xs font-bold text-slate-500 mt-1">Via: {item.via_administracion || "Sin via especificada"} | {item.frecuencia_cantidad ? `Cada ${item.frecuencia_cantidad} ${String(item.frecuencia_unidad || "").toLowerCase()}` : "Sin pauta"}</p></div>
                                <span className="text-xs font-black px-3 py-2 rounded-2xl bg-teal-50 text-teal-700">{item.duracion_cantidad ? `${item.duracion_cantidad} ${String(item.duracion_unidad || "").toLowerCase()}` : "Duracion sin definir"}</span>
                              </div>
                            )) : <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-sm font-bold text-slate-500">Sin medicamentos registrados.</div>}
                          </ConsultationSection>

                          <ConsultationSection title="Estudios solicitados">
                            {(entry.estudios ?? []).length ? entry.estudios.map((study) => (
                              <div key={study.id} className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3 mb-3">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">{study.nombre}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">{study.tipo || "Sin tipo"}</p>
                                    {study.problema_clinico ? (
                                      <p className="text-xs font-bold text-slate-500 mt-1">
                                        Problema clinico: {study.problema_clinico}
                                      </p>
                                    ) : null}
                                    {study.fecha_estudio ? (
                                      <p className="text-xs font-bold text-slate-500 mt-1">
                                        Fecha del estudio: {formatDateTime(study.fecha_estudio)}
                                      </p>
                                    ) : null}
                                    {(study.medico_solicita_nombre || study.medico_solicita_cedula) ? (
                                      <p className="text-xs font-bold text-slate-500 mt-1">
                                        Solicita: {study.medico_solicita_nombre || "Sin medico"} | Cedula: {study.medico_solicita_cedula || "Sin registro"}
                                      </p>
                                    ) : null}
                                  </div>
                                  <span className={`text-xs font-black px-3 py-2 rounded-2xl ${
                                    study.estado === "Revisado por el medico"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : study.estado === "Entregado por el paciente"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-indigo-50 text-indigo-700"
                                  }`}>
                                    {study.estado || "Solicitado"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                  <div className="md:col-span-5 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Estado</label>
                                    <select
                                      value={getStudyDraft(study).estado}
                                      onChange={(e) => updateStudyDraft(study.id, { estado: e.target.value })}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                    >
                                      <option>Solicitado</option>
                                      <option>Entregado por el paciente</option>
                                      <option>Revisado por el medico</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-7 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Observaciones / resultado</label>
                                    <input
                                      value={getStudyDraft(study).resultado}
                                      onChange={(e) => updateStudyDraft(study.id, { resultado: e.target.value })}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                      placeholder="Ej: BH normal, infiltrado basal derecho, glucosa elevada..."
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                  <div className="md:col-span-6 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Problema clinico</label>
                                    <input
                                      value={getStudyDraft(study).problema_clinico}
                                      onChange={(e) => updateStudyDraft(study.id, { problema_clinico: e.target.value })}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                      placeholder="Motivo por el que se solicito el estudio"
                                    />
                                  </div>
                                  <div className="md:col-span-6 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Fecha del estudio</label>
                                    <input
                                      type="datetime-local"
                                      value={getStudyDraft(study).fecha_estudio}
                                      onChange={(e) => updateStudyDraft(study.id, { fecha_estudio: e.target.value })}
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Interpretacion del medico</label>
                                  <textarea
                                    value={getStudyDraft(study).interpretacion}
                                    onChange={(e) => updateStudyDraft(study.id, { interpretacion: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-24 resize-none"
                                    placeholder="Interpretacion clinica del estudio..."
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-bold text-slate-500">
                                    {study.resultado
                                      ? `Ultimo resultado: ${study.resultado}`
                                      : study.interpretacion
                                      ? `Interpretacion: ${study.interpretacion}`
                                      : "Sin resultado registrado"}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => saveStudyStatus(study)}
                                    disabled={updatingStudyId === study.id}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-teal-100 hover:bg-teal-700 transition-colors disabled:opacity-60"
                                  >
                                    <CheckCircle2 size={14} />
                                    {updatingStudyId === study.id ? "Guardando..." : "Guardar estado"}
                                  </button>
                                </div>
                              </div>
                            )) : <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-sm font-bold text-slate-500">Sin estudios registrados.</div>}
                          </ConsultationSection>

                          {entry.notas ? <ConsultationSection title="Notas"><p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">{entry.notas}</p></ConsultationSection> : null}

                          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
                            <p className="text-sm font-black text-teal-800">
                              Firmado digitalmente por Dr. {entry.medico_nombre || "Sin medico"}, Cedula {entry.medico_cedula || "Sin registro"} el{" "}
                              {formatDateTime(entry.firma_timestamp || entry.updated_at || entry.fecha)}
                            </p>
                            {entry.firma_hash ? (
                              <p className="mt-1 break-all text-[11px] font-bold text-teal-700/80">
                                SHA-256: {entry.firma_hash}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Pill size={18} className="mr-2 text-teal-600" /> Medicacion actual</h4>
              <div className="space-y-3">
                {consultationHistory[0]?.recetas?.length ? consultationHistory[0].recetas.map((item) => (
                  <div key={item.id} className="p-3 bg-teal-50 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.medicamento} {item.dosis || ""}</p>
                      <p className="text-xs text-slate-500">Via: {item.via_administracion || "Sin via especificada"} | {item.frecuencia_cantidad ? `Cada ${item.frecuencia_cantidad} ${String(item.frecuencia_unidad || "").toLowerCase()}` : "Sin pauta"}</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                )) : <div className="p-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500">Sin medicacion registrada.</div>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2 text-amber-600" /> Estudios pendientes</h4>
              <div className="space-y-3">
                {pendingStudies.length ? pendingStudies.map((study) => (
                  <div key={`${study.consultationId}-${study.id}`} className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-sm font-bold text-slate-800">{study.nombre}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {study.estado} | Consulta del {formatConsultationDate(study.consultationDate)}
                    </p>
                  </div>
                )) : (
                  <div className="p-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-500">
                    No hay estudios pendientes de revision.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center"><NotebookText size={18} className="mr-2 text-teal-600" /> Contacto de emergencia</h4>
              <div className="space-y-3 text-sm font-bold text-slate-700">
                <div className="p-3 rounded-2xl bg-slate-50">{patient.contacto_emergencia_nombre || "Sin nombre registrado"}</div>
                <div className="p-3 rounded-2xl bg-slate-50">{patient.contacto_emergencia_telefono || "Sin telefono registrado"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeletePatientModal
        open={isDeleteModalOpen}
        patient={patient}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async (motivo) => {
          const deleted = await onDeletePatient(patient, motivo);
          if (deleted) setIsDeleteModalOpen(false);
        }}
      />
    </>
  );
}
