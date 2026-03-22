import React, { useEffect, useState } from "react";
import { LayoutDashboard, Calendar, Users, History, Settings } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import DashboardView from "./views/DashboardView";
import PatientsView from "./views/PatientsView";
import ClinicalRecordView from "./views/ClinicalRecordView";
import AgendaView from "./views/AgendaView";
import AuditLogView from "./views/AuditLogView";
import SettingsView from "./views/SettingsView";
import PatientPortalView from "./views/PatientPortalView";
import PublicBookingView from "./views/PublicBookingView";
import NewConsultationModal from "./modals/NewConsultationModal";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OwnerConsolePage from "./pages/OwnerConsolePage";
import RegisterDoctorPage from "./pages/RegisterDoctorPage";

import { defaultNewConsultation } from "./data/defaults";
import { apiFetch, ownerApiFetch } from "./lib/api";
import {
  clearOwnerSession,
  clearSession,
  getStoredOwnerSession,
  getStoredSession,
  isTokenExpired,
  saveOwnerSession,
  saveSession,
} from "./lib/auth";

const OWNER_CONSOLE_PATH = "/__saas-orbit-owner-8841";

const buildLegacyExplorationText = (consultation) => {
  if (consultation.descripcion_fisica) return consultation.descripcion_fisica;

  const sections = [
    ["Habitus exterior", consultation.habitus_exterior],
    ["Cabeza", consultation.exploracion_cabeza],
    ["Cuello", consultation.exploracion_cuello],
    ["Torax", consultation.exploracion_torax],
    ["Abdomen", consultation.exploracion_abdomen],
    ["Extremidades", consultation.exploracion_extremidades],
    ["Genitales", consultation.exploracion_genitales],
  ].filter(([, value]) => String(value || "").trim());

  return sections.map(([label, value]) => `${label}: ${value}`).join(" | ");
};

const formatConsultationForView = (consultation) => ({
  id: consultation.id,
  cita_id: consultation.cita_id ?? null,
  fecha: consultation.fecha,
  created_at: consultation.created_at,
  updated_at: consultation.updated_at,
  motivo: consultation.motivo || "Consulta General",
  diagnostico: consultation.diagnostico || "Sin diagnostico registrado",
  paciente_nombre_snapshot: consultation.paciente_nombre_snapshot || "",
  paciente_edad_snapshot: consultation.paciente_edad_snapshot ?? null,
  paciente_sexo_snapshot: consultation.paciente_sexo_snapshot || "",
  cie10_codigo: consultation.cie10_codigo || "",
  cie10_descripcion: consultation.cie10_descripcion || "",
  pronostico: consultation.pronostico || "",
  padecimiento_actual: consultation.padecimiento_actual || "",
  interrogatorio_aparatos_sistemas: consultation.interrogatorio_aparatos_sistemas || "",
  descripcion_fisica: buildLegacyExplorationText(consultation),
  habitus_exterior: consultation.habitus_exterior || consultation.descripcion_fisica || "",
  exploracion_cabeza: consultation.exploracion_cabeza || "",
  exploracion_cuello: consultation.exploracion_cuello || "",
  exploracion_torax: consultation.exploracion_torax || "",
  exploracion_abdomen: consultation.exploracion_abdomen || "",
  exploracion_extremidades: consultation.exploracion_extremidades || "",
  exploracion_genitales: consultation.exploracion_genitales || "",
  plan_tratamiento: consultation.plan_tratamiento || "",
  notas: consultation.notas || "",
  firma_hash: consultation.firma_hash || "",
  firma_timestamp: consultation.firma_timestamp || "",
  signos: {
    peso: consultation.signos?.peso || "N/A",
    talla: consultation.signos?.talla || "",
    glucosa: consultation.signos?.glucosa || "",
    ta: consultation.signos?.ta || "N/A",
    temp: consultation.signos?.temp || "N/A",
    frecuenciaCardiaca: consultation.signos?.frecuenciaCardiaca || "",
    frecuenciaRespiratoria: consultation.signos?.frecuenciaRespiratoria || "",
  },
  recetas: consultation.recetas || [],
  estudios: consultation.estudios || [],
  medico_nombre: consultation.medico_nombre || "",
  medico_cedula: consultation.medico_cedula || "",
});

const parseNumericValue = (value, suffix = "") => {
  const normalized = String(value || "").replace(suffix, "").trim();
  return normalized === "N/A" ? "" : normalized;
};

const createConsultationFormFromHistory = (consultation) => {
  const [taSistolica = "", taDiastolica = ""] = String(consultation.signos?.ta || "")
    .replace("N/A", "")
    .split("/");

  return {
    ...defaultNewConsultation,
    id: consultation.id,
    fecha: consultation.fecha,
    pacienteNombreSnapshot: consultation.paciente_nombre_snapshot || "",
    pacienteEdadSnapshot: consultation.paciente_edad_snapshot ?? null,
    pacienteSexoSnapshot: consultation.paciente_sexo_snapshot || "",
    peso: parseNumericValue(consultation.signos?.peso, "kg"),
    talla: consultation.signos?.talla || "",
    glucosa: consultation.signos?.glucosa || "",
    taSistolica: taSistolica.trim(),
    taDiastolica: taDiastolica.trim(),
    frecuenciaCardiaca: consultation.signos?.frecuenciaCardiaca || "",
    frecuenciaRespiratoria: consultation.signos?.frecuenciaRespiratoria || "",
    temperatura: parseNumericValue(consultation.signos?.temp, "C"),
    padecimientoActual: consultation.padecimiento_actual || "",
    interrogatorioAparatosSistemas: consultation.interrogatorio_aparatos_sistemas || "",
    diagnostico: consultation.diagnostico || "",
      cie10Codigo: consultation.cie10_codigo || "",
      cie10Descripcion: consultation.cie10_descripcion || "",
      pronostico: consultation.pronostico || "",
    descripcionFisica: buildLegacyExplorationText(consultation),
      habitusExterior: consultation.habitus_exterior || consultation.descripcion_fisica || "",
      exploracionCabeza: consultation.exploracion_cabeza || "",
      exploracionCuello: consultation.exploracion_cuello || "",
      exploracionTorax: consultation.exploracion_torax || "",
      exploracionAbdomen: consultation.exploracion_abdomen || "",
      exploracionExtremidades: consultation.exploracion_extremidades || "",
      exploracionGenitales: consultation.exploracion_genitales || "",
      motivo: consultation.motivo || "",
    planTratamiento: consultation.plan_tratamiento || "",
    medicamentos: (consultation.recetas || []).map((item) => ({
      id: item.id,
      nombre: item.medicamento || "",
      presentacion: item.presentacion || "Tableta",
      dosis: item.dosis || "",
      viaAdministracion: item.via_administracion || "Oral",
      cadaCantidad: item.frecuencia_cantidad ? String(item.frecuencia_cantidad) : "",
      cadaUnidad: item.frecuencia_unidad || "Horas",
      duranteCantidad: item.duracion_cantidad ? String(item.duracion_cantidad) : "",
      duranteUnidad: item.duracion_unidad || "Dias",
    })),
    estudios: (consultation.estudios || []).map((item) => ({
      id: item.id,
      nombre: item.nombre || "",
      tipo: item.tipo || "Laboratorio",
      estado: item.estado || "Solicitado",
      resultado: item.resultado || "",
      problemaClinico: item.problema_clinico || "",
      fechaEstudio: item.fecha_estudio
        ? new Date(item.fecha_estudio).toISOString().slice(0, 16)
        : "",
      interpretacion: item.interpretacion || "",
      medicoSolicitaNombre: item.medico_solicita_nombre || "",
      medicoSolicitaCedula: item.medico_solicita_cedula || "",
    })),
  };
};

const getNextExternalId = (patients) => {
  const maxNumber = patients.reduce((max, patient) => {
    const match = String(patient.external_id || "").match(/^PX-(\d+)$/i);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 1000);

  return `PX-${String(maxNumber + 1).padStart(4, "0")}`;
};

const getBrowserLocation = () => {
  if (typeof window === "undefined") {
    return { pathname: "/", hash: "" };
  }

  return {
    pathname: window.location.pathname || "/",
    hash: window.location.hash || "",
  };
};

export default function App() {
  const [routeLocation, setRouteLocation] = useState(getBrowserLocation);
  const { pathname, hash } = routeLocation;
  const patientPortalMatch = pathname.match(/^\/p\/([^/]+)\/?$/);
  const patientPortalToken = patientPortalMatch?.[1] ? decodeURIComponent(patientPortalMatch[1]) : null;
  const publicAgendaMatch = pathname.match(/^\/agenda\/([^/]+)\/?$/);
  const publicAgendaSlug = publicAgendaMatch?.[1] ? decodeURIComponent(publicAgendaMatch[1]) : null;
  const isOwnerConsoleRoute = pathname === OWNER_CONSOLE_PATH;
  const isDoctorRegisterRoute = pathname === "/registro-medico";
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisteringDoctor, setIsRegisteringDoctor] = useState(false);
  const [doctorRegistrationError, setDoctorRegistrationError] = useState("");
  const [doctorRegistrationSuccessMessage, setDoctorRegistrationSuccessMessage] = useState("");
  const [ownerReady, setOwnerReady] = useState(false);
  const [ownerUser, setOwnerUser] = useState(null);
  const [ownerAuthError, setOwnerAuthError] = useState("");
  const [isOwnerLoggingIn, setIsOwnerLoggingIn] = useState(false);
  const [ownerConfig, setOwnerConfig] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_password: "",
    smtp_from_email: "",
    leads_notify_email: "",
    smtp_password_configured: false,
  });
  const [ownerConfigLoading, setOwnerConfigLoading] = useState(false);
  const [ownerConfigError, setOwnerConfigError] = useState("");
  const [ownerConfigSuccessMessage, setOwnerConfigSuccessMessage] = useState("");
  const [ownerDoctors, setOwnerDoctors] = useState([]);
  const [ownerDoctorsLoading, setOwnerDoctorsLoading] = useState(false);
  const [ownerLeads, setOwnerLeads] = useState([]);
  const [ownerLeadsLoading, setOwnerLeadsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [updatingOwnerLeadId, setUpdatingOwnerLeadId] = useState(null);
  const [isCreatingOwnerDoctor, setIsCreatingOwnerDoctor] = useState(false);
  const [isValidatingOwnerDoctorLicense, setIsValidatingOwnerDoctorLicense] = useState(false);
  const [createOwnerDoctorError, setCreateOwnerDoctorError] = useState("");
  const [ownerDoctorSuccessMessage, setOwnerDoctorSuccessMessage] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState("");
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationsLoading, setConsultationsLoading] = useState(false);
  const [consultationsError, setConsultationsError] = useState("");
  const [isSavingConsultation, setIsSavingConsultation] = useState(false);
  const [newConsultation, setNewConsultation] = useState(defaultNewConsultation);
  const [editingConsultation, setEditingConsultation] = useState(null);
  const [consultationSourceAppointment, setConsultationSourceAppointment] = useState(null);
  const [focusedConsultationId, setFocusedConsultationId] = useState(null);
  const [agendaRefreshToken, setAgendaRefreshToken] = useState(0);
  const [clinicConfig, setClinicConfig] = useState({
    nombre_consultorio: "Consultorio MyCliniq",
    direccion: "Tijuana, Baja California",
    telefono: "664 000 0000",
    email_contacto: "doctora@mycliniq.lat",
    cedula_profesional: "12345678",
    especialidad: "Medicina general",
    zona_horaria: "America/Tijuana",
    horario_laboral: {
      0: { activo: false, inicio: "09:00", fin: "17:00" },
      1: { activo: true, inicio: "09:00", fin: "17:00" },
      2: { activo: true, inicio: "09:00", fin: "17:00" },
      3: { activo: true, inicio: "09:00", fin: "17:00" },
      4: { activo: true, inicio: "09:00", fin: "17:00" },
      5: { activo: true, inicio: "09:00", fin: "17:00" },
      6: { activo: false, inicio: "09:00", fin: "14:00" },
    },
    logo_data_url: "",
  });
  const [clinicConfigError, setClinicConfigError] = useState("");
  const [isSavingClinicConfig, setIsSavingClinicConfig] = useState(false);
  const [billingProfile, setBillingProfile] = useState(null);
  const [billingProfileLoading, setBillingProfileLoading] = useState(false);
  const [billingProfileError, setBillingProfileError] = useState("");
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [updatingOwnerDoctorId, setUpdatingOwnerDoctorId] = useState(null);
  const [ownerDoctorBillingHistory, setOwnerDoctorBillingHistory] = useState({});
  const [ownerDoctorBillingHistoryLoadingId, setOwnerDoctorBillingHistoryLoadingId] = useState(null);
  const nextExternalId = getNextExternalId(patients);

  const navigate = (target, options = {}) => {
    if (typeof window === "undefined") return;
    const nextUrl = target || "/";
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextUrl);
    setRouteLocation(getBrowserLocation());
  };

  const logout = async () => {
    if (getStoredSession()?.token) {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignore logout network failures and clear local session anyway.
      }
    }

    clearSession();
    setAuthUser(null);
    setAuthError("");
    setActiveTab("dashboard");
    setPatients([]);
    setSelectedPatient(null);
    setConsultationHistory([]);
    setShowConsultationModal(false);
    setNewConsultation(defaultNewConsultation);
    setEditingConsultation(null);
    setConsultationSourceAppointment(null);
    setFocusedConsultationId(null);
    navigate("/login", { replace: true });
  };

  const ownerLogout = async () => {
    if (getStoredOwnerSession()?.token) {
      try {
        await ownerApiFetch("/api/owner/auth/logout", { method: "POST" });
      } catch {
        // Ignore owner logout network failures and clear local session anyway.
      }
    }

    clearOwnerSession();
    setOwnerUser(null);
    setOwnerAuthError("");
    setOwnerConfigError("");
    setOwnerConfigSuccessMessage("");
    setCreateOwnerDoctorError("");
    setOwnerDoctorSuccessMessage("");
    setOwnerDoctors([]);
    navigate(OWNER_CONSOLE_PATH, { replace: true });
  };

  useEffect(() => {
    const syncLocation = () => setRouteLocation(getBrowserLocation());

    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);

    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    const handleOwnerUnauthorized = () => {
      ownerLogout();
    };

    window.addEventListener("owner:unauthorized", handleOwnerUnauthorized);
    return () => window.removeEventListener("owner:unauthorized", handleOwnerUnauthorized);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const session = getStoredSession();
      if (!session?.token || isTokenExpired(session.token)) {
        clearSession();
        setAuthReady(true);
        return;
      }

      try {
        const response = await apiFetch("/api/auth/me");
        if (!response.ok) {
          throw new Error("Sesión no válida");
        }

        const data = await response.json();
        saveSession({ token: session.token, user: data.user });
        setAuthUser(data.user);
      } catch {
        clearSession();
        setAuthUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const restoreOwnerSession = async () => {
      if (!isOwnerConsoleRoute) {
        setOwnerReady(true);
        return;
      }

      const session = getStoredOwnerSession();
      if (!session?.token || isTokenExpired(session.token)) {
        clearOwnerSession();
        setOwnerReady(true);
        return;
      }

      try {
        const response = await ownerApiFetch("/api/owner/auth/me");
        if (!response.ok) {
          throw new Error("Sesión owner no válida");
        }

        const data = await response.json();
        saveOwnerSession({ token: session.token, owner: data.owner });
        setOwnerUser(data.owner);
      } catch {
        clearOwnerSession();
        setOwnerUser(null);
      } finally {
        setOwnerReady(true);
      }
    };

    restoreOwnerSession();
  }, [isOwnerConsoleRoute]);

  const login = async ({ email, password }) => {
    try {
      setIsLoggingIn(true);
      setAuthError("");
      setAuthNotice("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo iniciar sesión (${response.status})`);
      }

      saveSession(data);
      setAuthUser(data.user);
      setActiveTab("dashboard");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setAuthError(error.message || "No se pudo iniciar sesión");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const registerDoctor = async (payload) => {
    try {
      setIsRegisteringDoctor(true);
      setDoctorRegistrationError("");
      setDoctorRegistrationSuccessMessage("");

      const response = await fetch("/api/auth/register-doctor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo enviar la solicitud (${response.status})`);
      }

      setDoctorRegistrationSuccessMessage(
        data.message || "Recibimos tu solicitud. Te avisaremos en cuanto tu cuenta este verificada."
      );
      setAuthNotice(
        data.message || "Recibimos tu solicitud. Tu cuenta quedo en revision y te avisaremos cuando este aprobada."
      );
      navigate("/login", { replace: true });
      return true;
    } catch (error) {
      setDoctorRegistrationError(error.message || "No se pudo enviar la solicitud");
      return false;
    } finally {
      setIsRegisteringDoctor(false);
    }
  };

  const ownerLogin = async ({ email, password }) => {
    try {
      setIsOwnerLoggingIn(true);
      setOwnerAuthError("");

      const response = await fetch("/api/owner/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo iniciar sesión owner (${response.status})`);
      }

      saveOwnerSession(data);
      setOwnerUser(data.owner);
      navigate(OWNER_CONSOLE_PATH, { replace: true });
    } catch (error) {
      setOwnerAuthError(error.message || "No se pudo iniciar sesión owner");
    } finally {
      setIsOwnerLoggingIn(false);
    }
  };

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      setPatientsError("");

      const response = await apiFetch("/api/pacientes");
      if (!response.ok) {
        throw new Error(`No se pudo cargar pacientes (${response.status})`);
      }

      const data = await response.json();
      setPatients(data);
      setSelectedPatient((prev) => {
        if (!data.length) return null;
        if (!prev) return data[0];
        return data.find((item) => item.id === prev.id) || data[0];
      });
    } catch (error) {
      setPatientsError(error.message || "No se pudo conectar con el servidor");
    } finally {
      setPatientsLoading(false);
    }
  };

  const loadClinicConfig = async () => {
    try {
      setClinicConfigError("");
      const response = await apiFetch("/api/configuracion-consultorio");
      if (!response.ok) {
        throw new Error(`No se pudo cargar configuracion (${response.status})`);
      }

      const data = await response.json();
      setClinicConfig((prev) => ({ ...prev, ...data }));
    } catch (error) {
      setClinicConfigError(error.message || "No se pudo cargar configuracion del consultorio");
    }
  };

  const loadOwnerConfig = async () => {
    try {
      setOwnerConfigLoading(true);
      setOwnerConfigError("");
      const response = await ownerApiFetch("/api/owner/config");
      if (!response.ok) {
        throw new Error(`No se pudo cargar configuracion owner (${response.status})`);
      }

      const data = await response.json();
      setOwnerConfig((prev) => ({ ...prev, ...data }));
    } catch (error) {
      setOwnerConfigError(error.message || "No se pudo cargar configuracion owner");
    } finally {
      setOwnerConfigLoading(false);
    }
  };

  const loadOwnerDoctors = async () => {
    try {
      setOwnerDoctorsLoading(true);
      setCreateOwnerDoctorError("");
      const response = await ownerApiFetch("/api/owner/doctors");
      if (!response.ok) {
        throw new Error(`No se pudo cargar medicos (${response.status})`);
      }

      const data = await response.json();
      setOwnerDoctors(data);
    } catch (error) {
      setCreateOwnerDoctorError(error.message || "No se pudo cargar medicos");
    } finally {
      setOwnerDoctorsLoading(false);
    }
  };

  const loadOwnerLeads = async () => {
    try {
      setOwnerLeadsLoading(true);
      const response = await ownerApiFetch("/api/owner/leads?limit=100");
      if (!response.ok) {
        throw new Error(`No se pudieron cargar leads (${response.status})`);
      }

      const data = await response.json();
      setOwnerLeads(data);
    } catch (error) {
      setOwnerConfigError((prev) => prev || error.message || "No se pudieron cargar leads");
    } finally {
      setOwnerLeadsLoading(false);
    }
  };

  const loadBillingProfile = async () => {
    try {
      setBillingProfileLoading(true);
      setBillingProfileError("");
      const response = await apiFetch("/api/billing/me");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo cargar facturacion (${response.status})`);
      }

      setBillingProfile(data);
    } catch (error) {
      setBillingProfileError(error.message || "No se pudo cargar la facturacion");
    } finally {
      setBillingProfileLoading(false);
    }
  };

  const startBillingCheckout = async () => {
    try {
      setBillingActionLoading(true);
      setBillingProfileError("");

      const response = await apiFetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo iniciar Stripe Checkout (${response.status})`);
      }

      if (!data?.url) {
        throw new Error("Stripe no devolvio una URL valida");
      }

      window.location.assign(data.url);
    } catch (error) {
      setBillingProfileError(error.message || "No se pudo iniciar el cobro");
    } finally {
      setBillingActionLoading(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      setBillingActionLoading(true);
      setBillingProfileError("");

      const response = await apiFetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo abrir el portal Stripe (${response.status})`);
      }

      if (!data?.url) {
        throw new Error("Stripe no devolvio una URL valida");
      }

      window.location.assign(data.url);
    } catch (error) {
      setBillingProfileError(error.message || "No se pudo abrir el portal de facturacion");
    } finally {
      setBillingActionLoading(false);
    }
  };

  const updateOwnerLead = async (leadId, payload) => {
    try {
      setUpdatingOwnerLeadId(leadId);
      const response = await ownerApiFetch(`/api/owner/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo actualizar lead (${response.status})`);
      }

      setOwnerLeads((prev) => prev.map((lead) => (lead.id === leadId ? data : lead)));
      return data;
    } catch (error) {
      setOwnerConfigError((prev) => prev || error.message || "No se pudo actualizar lead");
      return null;
    } finally {
      setUpdatingOwnerLeadId(null);
    }
  };

  const updateOwnerDoctor = async (doctorId, payload) => {
    try {
      setUpdatingOwnerDoctorId(doctorId);
      setCreateOwnerDoctorError("");

      const response = await ownerApiFetch(`/api/owner/doctors/${doctorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo actualizar medico (${response.status})`);
      }

      setOwnerDoctors((prev) => prev.map((doctor) => (doctor.id === doctorId ? data : doctor)));
      return data;
    } catch (error) {
      setCreateOwnerDoctorError(error.message || "No se pudo actualizar el medico");
      return null;
    } finally {
      setUpdatingOwnerDoctorId(null);
    }
  };

  const loadOwnerDoctorBillingHistory = async (doctorId) => {
    try {
      setOwnerDoctorBillingHistoryLoadingId(doctorId);
      const response = await ownerApiFetch(`/api/owner/doctors/${doctorId}/billing-history?limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo cargar historial de facturacion (${response.status})`);
      }

      setOwnerDoctorBillingHistory((prev) => ({
        ...prev,
        [doctorId]: data,
      }));
      return data;
    } catch (error) {
      setCreateOwnerDoctorError(error.message || "No se pudo cargar el historial de facturacion");
      return null;
    } finally {
      setOwnerDoctorBillingHistoryLoadingId(null);
    }
  };

  const loadConsultations = async (patientId) => {
    if (!patientId) {
      setConsultationHistory([]);
      return;
    }

    try {
      setConsultationsLoading(true);
      setConsultationsError("");

      const response = await apiFetch(`/api/consultas?paciente_id=${patientId}`);
      if (!response.ok) {
        throw new Error(`No se pudo cargar consultas (${response.status})`);
      }

      const data = await response.json();
      setConsultationHistory(data.map(formatConsultationForView));
    } catch (error) {
      setConsultationsError(error.message || "No se pudo cargar el expediente");
    } finally {
      setConsultationsLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser) return;
    loadPatients();
    loadClinicConfig();
    if (["admin", "medico"].includes(authUser?.rol)) {
      loadBillingProfile();
    } else {
      setBillingProfile(null);
      setBillingProfileError("");
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser || activeTab !== "configuracion") return;
    if (!["admin", "medico"].includes(authUser?.rol)) return;
    loadBillingProfile();
  }, [activeTab, authUser]);

  useEffect(() => {
    if (!ownerUser || !isOwnerConsoleRoute) return;
    loadOwnerConfig();
    loadOwnerDoctors();
    loadOwnerLeads();
  }, [ownerUser, isOwnerConsoleRoute]);

  useEffect(() => {
    if (!authUser) return;
    loadConsultations(selectedPatient?.id);
  }, [selectedPatient, authUser]);

  useEffect(() => {
    if (!authReady || patientPortalToken || publicAgendaSlug || isOwnerConsoleRoute || isDoctorRegisterRoute) return;

    if (authUser && (pathname === "/" || pathname === "/login")) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!authUser && pathname !== "/" && pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [authReady, authUser, pathname, patientPortalToken, publicAgendaSlug, isOwnerConsoleRoute, isDoctorRegisterRoute]);

  const openPatientRecord = (patient, options = {}) => {
    apiFetch(`/api/pacientes/${patient.id}/open-record`, {
      method: "POST",
    }).catch(() => {});

    setSelectedPatient(patient);
    setFocusedConsultationId(options.consultationId ?? null);
    setActiveTab("expediente");
  };

  const createPatient = async (payload) => {
    try {
      setIsCreatingPatient(true);
      setPatientsError("");

      const response = await apiFetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          external_id: nextExternalId,
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo crear el paciente (${response.status})`);
      }

      const created = await response.json();
      await loadPatients();
      setSelectedPatient(created);
      return created;
    } catch (error) {
      setPatientsError(error.message || "No se pudo crear el paciente");
      return null;
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const updatePatient = async (patient, payload) => {
    try {
      setIsUpdatingPatient(true);
      setPatientsError("");

      const response = await apiFetch(`/api/pacientes/${patient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          activo: patient.activo,
          ultima_visita: patient.ultima_visita,
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo actualizar el paciente (${response.status})`);
      }

      const updated = await response.json();
      setPatients((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedPatient((prev) => (prev?.id === updated.id ? updated : prev));
      return updated;
    } catch (error) {
      setPatientsError(error.message || "No se pudo actualizar el paciente");
      return null;
    } finally {
      setIsUpdatingPatient(false);
    }
  };

  const deletePatient = async (patient, motivoBaja) => {
    try {
      setPatientsError("");

      const response = await apiFetch(`/api/pacientes/${patient.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motivo_baja: motivoBaja || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo eliminar el paciente (${response.status})`);
      }

      const data = await response.json();
      const updatedPatient = data.patient;

      setPatients((prev) => prev.map((item) => (item.id === updatedPatient.id ? updatedPatient : item)));
      setSelectedPatient((prev) => (prev?.id === updatedPatient.id ? updatedPatient : prev));

      return true;
    } catch (error) {
      setPatientsError(error.message || "No se pudo dar de baja al paciente");
      return false;
    }
  };

  const reactivatePatient = async (patient) => {
    return updatePatient(patient, {
      nombre: patient.nombre,
      curp: patient.curp,
      fecha_nacimiento: patient.fecha_nacimiento,
      sexo: patient.sexo,
      tipo_sangre: patient.tipo_sangre,
      telefono: patient.telefono,
      email: patient.email,
      direccion: patient.direccion,
      contacto_emergencia_nombre: patient.contacto_emergencia_nombre,
      contacto_emergencia_telefono: patient.contacto_emergencia_telefono,
      alergias_resumen: patient.alergias_resumen,
      dado_de_baja: false,
      fecha_baja: null,
      motivo_baja: null,
      activo: true,
    });
  };

  const saveConsultation = async (consentimientoClinico) => {
    if (!selectedPatient) return;

    try {
      setIsSavingConsultation(true);
      setConsultationsError("");

      const payload = {
        paciente_id: selectedPatient.id,
        cita_id: consultationSourceAppointment?.id ?? null,
        fecha: new Date().toISOString(),
        motivo: newConsultation.motivo || "Consulta General",
        padecimiento_actual: newConsultation.padecimientoActual || "",
        interrogatorio_aparatos_sistemas: newConsultation.interrogatorioAparatosSistemas || "",
        descripcion_fisica: newConsultation.habitusExterior || newConsultation.descripcionFisica || "",
        habitus_exterior: newConsultation.habitusExterior || newConsultation.descripcionFisica || "",
        exploracion_cabeza: newConsultation.exploracionCabeza || "",
        exploracion_cuello: newConsultation.exploracionCuello || "",
        exploracion_torax: newConsultation.exploracionTorax || "",
        exploracion_abdomen: newConsultation.exploracionAbdomen || "",
        exploracion_extremidades: newConsultation.exploracionExtremidades || "",
        exploracion_genitales: newConsultation.exploracionGenitales || "",
        diagnostico: newConsultation.diagnostico || "",
        cie10_codigo: newConsultation.cie10Codigo || null,
        cie10_descripcion: newConsultation.cie10Descripcion || null,
        pronostico: newConsultation.pronostico || "",
        plan_tratamiento: newConsultation.planTratamiento || "",
        signos: {
          peso: newConsultation.peso ? `${newConsultation.peso}kg` : "N/A",
          talla: newConsultation.talla || "",
          glucosa: newConsultation.glucosa || "",
          ta:
            newConsultation.taSistolica && newConsultation.taDiastolica
              ? `${newConsultation.taSistolica}/${newConsultation.taDiastolica}`
              : "N/A",
          temp: newConsultation.temperatura ? `${newConsultation.temperatura} C` : "N/A",
          frecuenciaCardiaca: newConsultation.frecuenciaCardiaca || "",
          frecuenciaRespiratoria: newConsultation.frecuenciaRespiratoria || "",
        },
        medicamentos: newConsultation.medicamentos ?? [],
        estudios: newConsultation.estudios ?? [],
        consentimiento_clinico: consentimientoClinico,
      };

      const isEditing = Boolean(editingConsultation?.id);
      const response = await apiFetch(
        isEditing ? `/api/consultas/${editingConsultation.id}` : "/api/consultas",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `${isEditing ? "No se pudo actualizar la consulta" : "No se pudo guardar la consulta"} (${response.status})`
        );
      }

      await response.json();
      setShowConsultationModal(false);
      setEditingConsultation(null);
      if (consultationSourceAppointment?.id) {
        setAgendaRefreshToken((prev) => prev + 1);
      }
      setConsultationSourceAppointment(null);
      setNewConsultation(defaultNewConsultation);
      await loadConsultations(selectedPatient.id);
      await loadPatients();
    } catch (error) {
      setConsultationsError(error.message || "No se pudo guardar la consulta");
    } finally {
      setIsSavingConsultation(false);
    }
  };

  const startNewConsultation = () => {
    setEditingConsultation(null);
    setConsultationSourceAppointment(null);
    setNewConsultation(defaultNewConsultation);
    setShowConsultationModal(true);
  };

  const startEditingConsultation = (consultation) => {
    setEditingConsultation(consultation);
    setConsultationSourceAppointment(null);
    setNewConsultation(createConsultationFormFromHistory(consultation));
    setShowConsultationModal(true);
  };

  const repeatConsultationPrescription = (consultation) => {
    setEditingConsultation(null);
    setConsultationSourceAppointment(null);
    setNewConsultation({
      ...defaultNewConsultation,
      motivo: consultation.motivo || "",
    medicamentos: (consultation.recetas || []).map((item, index) => ({
      id: Date.now() + index,
      nombre: item.medicamento || "",
      presentacion: item.presentacion || "Tableta",
      dosis: item.dosis || "",
      viaAdministracion: item.via_administracion || "Oral",
      cadaCantidad: item.frecuencia_cantidad ? String(item.frecuencia_cantidad) : "",
      cadaUnidad: item.frecuencia_unidad || "Horas",
      duranteCantidad: item.duracion_cantidad ? String(item.duracion_cantidad) : "",
        duranteUnidad: item.duracion_unidad || "Dias",
      })),
    });
    setShowConsultationModal(true);
  };

  const startConsultationFromAppointment = (appointment, patient) => {
    if (!patient) {
      setPatientsError("La cita no esta ligada a un paciente existente.");
      return;
    }

    const questionnaireSummary = [
      appointment.cuestionario_sintomas_actuales
        ? `Sintomas actuales: ${appointment.cuestionario_sintomas_actuales}`
        : "",
      appointment.cuestionario_medicamentos_actuales
        ? `Medicamentos actuales: ${appointment.cuestionario_medicamentos_actuales}`
        : "",
      appointment.cuestionario_alergias_conocidas
        ? `Alergias conocidas: ${appointment.cuestionario_alergias_conocidas}`
        : "",
      appointment.cuestionario_cambios_desde_ultima_visita
        ? `Cambios desde la última visita: ${appointment.cuestionario_cambios_desde_ultima_visita}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    setSelectedPatient(patient);
    setEditingConsultation(null);
    setConsultationSourceAppointment(appointment);
    setFocusedConsultationId(null);
    setNewConsultation({
      ...defaultNewConsultation,
      motivo: appointment.cuestionario_motivo_consulta || appointment.motivo || "",
      padecimientoActual: questionnaireSummary,
    });
    setShowConsultationModal(true);
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "agenda", label: "Agenda Semanal", icon: Calendar },
    { id: "pacientes", label: "Pacientes", icon: Users },
    ...(["admin", "medico"].includes(authUser?.rol)
      ? [
          { id: "bitacora", label: "Bitacora", icon: History },
          { id: "configuracion", label: "Configuracion", icon: Settings },
        ]
      : []),
  ];

  const saveClinicConfiguration = async () => {
    try {
      setIsSavingClinicConfig(true);
      setClinicConfigError("");

      const response = await apiFetch("/api/configuracion-consultorio", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clinicConfig),
      });

      if (!response.ok) {
        throw new Error(`No se pudo guardar configuracion (${response.status})`);
      }

      const data = await response.json();
      setClinicConfig((prev) => ({ ...prev, ...data }));
    } catch (error) {
      setClinicConfigError(error.message || "No se pudo guardar configuracion");
    } finally {
      setIsSavingClinicConfig(false);
    }
  };

  const saveOwnerConfiguration = async (payload) => {
    try {
      setOwnerConfigLoading(true);
      setOwnerConfigError("");
      setOwnerConfigSuccessMessage("");

      const response = await ownerApiFetch("/api/owner/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo guardar SMTP (${response.status})`);
      }

      setOwnerConfig((prev) => ({ ...prev, ...data }));
      setOwnerConfigSuccessMessage("Configuracion SMTP guardada correctamente");
      return true;
    } catch (error) {
      setOwnerConfigError(error.message || "No se pudo guardar configuracion SMTP");
      return false;
    } finally {
      setOwnerConfigLoading(false);
    }
  };

  const createOwnerDoctor = async (payload) => {
    try {
      setIsCreatingOwnerDoctor(true);
      setCreateOwnerDoctorError("");
      setOwnerDoctorSuccessMessage("");

      const response = await ownerApiFetch("/api/owner/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo crear medico (${response.status})`);
      }

      setOwnerDoctors((prev) => [data, ...prev]);
      setOwnerDoctorSuccessMessage(`Medico creado: ${data.email}`);
      return data;
    } catch (error) {
      setCreateOwnerDoctorError(error.message || "No se pudo crear medico");
      return null;
    } finally {
      setIsCreatingOwnerDoctor(false);
    }
  };

  const validateOwnerDoctorLicense = async (cedulaProfesional) => {
    try {
      setIsValidatingOwnerDoctorLicense(true);
      setCreateOwnerDoctorError("");
      setOwnerDoctorSuccessMessage("");

      const response = await ownerApiFetch("/api/owner/doctors/validate-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cedula_profesional: cedulaProfesional }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `No se pudo validar la cedula (${response.status})`);
      }

      return data;
    } catch (error) {
      setCreateOwnerDoctorError(error.message || "No se pudo validar la cedula");
      return null;
    } finally {
      setIsValidatingOwnerDoctorLicense(false);
    }
  };

  if (!authReady) {
    if (isOwnerConsoleRoute) {
      return (
        <OwnerConsolePage
          owner={ownerUser}
          isReady={ownerReady}
          isLoggingIn={isOwnerLoggingIn}
          authError={ownerAuthError}
          doctors={ownerDoctors}
          doctorsLoading={ownerDoctorsLoading}
          leads={ownerLeads}
          leadsLoading={ownerLeadsLoading}
          updatingLeadId={updatingOwnerLeadId}
          updatingDoctorId={updatingOwnerDoctorId}
          ownerConfig={ownerConfig}
          configLoading={ownerConfigLoading}
          onLogin={ownerLogin}
          onLogout={ownerLogout}
          onCreateDoctor={createOwnerDoctor}
          onValidateDoctorLicense={validateOwnerDoctorLicense}
          isCreatingDoctor={isCreatingOwnerDoctor}
          isValidatingDoctorLicense={isValidatingOwnerDoctorLicense}
          createDoctorError={createOwnerDoctorError}
          doctorSuccessMessage={ownerDoctorSuccessMessage}
          onSaveConfig={saveOwnerConfiguration}
          isSavingConfig={ownerConfigLoading}
          configError={ownerConfigError}
          configSuccessMessage={ownerConfigSuccessMessage}
          onUpdateLead={updateOwnerLead}
          onUpdateDoctor={updateOwnerDoctor}
          doctorBillingHistory={ownerDoctorBillingHistory}
          billingHistoryLoadingId={ownerDoctorBillingHistoryLoadingId}
          onLoadDoctorBillingHistory={loadOwnerDoctorBillingHistory}
        />
      );
    }

    if (patientPortalToken) {
      return <PatientPortalView token={patientPortalToken} />;
    }

    if (publicAgendaSlug) {
      return <PublicBookingView slug={publicAgendaSlug} />;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-black text-slate-500">Preparando sesión...</div>
      </div>
    );
  }

  if (patientPortalToken) {
    return <PatientPortalView token={patientPortalToken} />;
  }

  if (publicAgendaSlug) {
    return <PublicBookingView slug={publicAgendaSlug} />;
  }

  if (isDoctorRegisterRoute) {
    return (
      <RegisterDoctorPage
        isSubmitting={isRegisteringDoctor}
        error={doctorRegistrationError}
        successMessage={doctorRegistrationSuccessMessage}
        onSubmit={registerDoctor}
        onNavigate={navigate}
      />
    );
  }

  if (isOwnerConsoleRoute) {
    return (
      <OwnerConsolePage
        owner={ownerUser}
        isReady={ownerReady}
        isLoggingIn={isOwnerLoggingIn}
        authError={ownerAuthError}
        doctors={ownerDoctors}
        doctorsLoading={ownerDoctorsLoading}
        leads={ownerLeads}
        leadsLoading={ownerLeadsLoading}
        updatingLeadId={updatingOwnerLeadId}
        ownerConfig={ownerConfig}
        configLoading={ownerConfigLoading}
        onLogin={ownerLogin}
        onLogout={ownerLogout}
        onCreateDoctor={createOwnerDoctor}
        onValidateDoctorLicense={validateOwnerDoctorLicense}
        isCreatingDoctor={isCreatingOwnerDoctor}
        isValidatingDoctorLicense={isValidatingOwnerDoctorLicense}
        createDoctorError={createOwnerDoctorError}
        doctorSuccessMessage={ownerDoctorSuccessMessage}
        onSaveConfig={saveOwnerConfiguration}
        isSavingConfig={ownerConfigLoading}
        configError={ownerConfigError}
        configSuccessMessage={ownerConfigSuccessMessage}
        onUpdateLead={updateOwnerLead}
        updatingDoctorId={updatingOwnerDoctorId}
        onUpdateDoctor={updateOwnerDoctor}
        doctorBillingHistory={ownerDoctorBillingHistory}
        billingHistoryLoadingId={ownerDoctorBillingHistoryLoadingId}
        onLoadDoctorBillingHistory={loadOwnerDoctorBillingHistory}
      />
    );
  }

  if (!authUser) {
    if (pathname === "/") {
      return <LandingPage onNavigate={navigate} initialHash={hash} />;
    }

    return <LoginPage onLogin={login} isLoading={isLoggingIn} error={authError} notice={authNotice} onNavigate={navigate} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        items={sidebarItems}
        user={authUser}
        onLogout={logout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <Topbar title={activeTab} onMenuToggle={() => setIsMobileSidebarOpen(true)} />

        {activeTab === "dashboard" && <DashboardView currentUser={authUser} />}

        {activeTab === "pacientes" && (
          <PatientsView
            patients={patients}
            isLoading={patientsLoading}
            error={patientsError}
            currentUser={authUser}
            clinicConfig={clinicConfig}
            onCreatePatient={createPatient}
            onUpdatePatient={updatePatient}
            isCreatingPatient={isCreatingPatient}
            isUpdatingPatient={isUpdatingPatient}
            nextExternalId={nextExternalId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenRecord={openPatientRecord}
            selectedPatientId={selectedPatient?.id}
          />
        )}

        {activeTab === "expediente" && (
          <ClinicalRecordView
            patient={selectedPatient}
            consultationHistory={consultationHistory}
            isLoading={consultationsLoading}
            error={consultationsError}
            clinicConfig={clinicConfig}
            focusedConsultationId={focusedConsultationId}
            onConsultationFocusHandled={() => setFocusedConsultationId(null)}
            onNewConsultation={startNewConsultation}
            onEditConsultation={startEditingConsultation}
            onRepeatPrescription={repeatConsultationPrescription}
            onRefreshConsultations={() => loadConsultations(selectedPatient?.id)}
            onDeletePatient={deletePatient}
            onReactivatePatient={reactivatePatient}
          />
        )}

        {activeTab === "agenda" && (
          <AgendaView
            patients={patients}
            refreshToken={agendaRefreshToken}
            onOpenRecord={openPatientRecord}
            onStartConsultation={startConsultationFromAppointment}
          />
        )}

        {activeTab === "bitacora" && ["admin", "medico"].includes(authUser?.rol) ? (
          <AuditLogView />
        ) : null}

        {activeTab === "configuracion" && ["admin", "medico"].includes(authUser?.rol) ? (
          <SettingsView
            clinicConfig={clinicConfig}
            setClinicConfig={setClinicConfig}
            onSave={saveClinicConfiguration}
            isSaving={isSavingClinicConfig}
            error={clinicConfigError}
            billingProfile={billingProfile}
            billingProfileLoading={billingProfileLoading}
            billingProfileError={billingProfileError}
            billingActionLoading={billingActionLoading}
            onStartBillingCheckout={startBillingCheckout}
            onOpenBillingPortal={openBillingPortal}
          />
        ) : null}
      </main>

      <NewConsultationModal
        open={showConsultationModal}
        onClose={() => {
          setShowConsultationModal(false);
          setEditingConsultation(null);
          setConsultationSourceAppointment(null);
          setNewConsultation(defaultNewConsultation);
        }}
        consultation={newConsultation}
        setConsultation={setNewConsultation}
        onSave={saveConsultation}
        patient={selectedPatient}
        currentUser={authUser}
        clinicConfig={clinicConfig}
        mode={editingConsultation ? "edit" : "create"}
        isSaving={isSavingConsultation}
      />
    </div>
  );
}
