import React, { useEffect, useState } from "react";
import { Search, Plus, X, Pencil } from "lucide-react";

const formatLastVisit = (value) => {
  if (!value) return "Sin registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const curpRegex =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

const normalizeCurp = (value) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 18);

const isValidCurp = (value) => curpRegex.test(normalizeCurp(value));

const createInitialForm = () => ({
  nombre: "",
  curp: "",
  fecha_nacimiento: "",
  sexo: "",
  tipo_sangre: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto_emergencia_nombre: "",
  contacto_emergencia_telefono: "",
  alergias_resumen: "",
  consentimiento_datos_personales: false,
});

const createFormFromPatient = (patient) => ({
  nombre: patient?.nombre || "",
  curp: patient?.curp || "",
  fecha_nacimiento: patient?.fecha_nacimiento ? String(patient.fecha_nacimiento).slice(0, 10) : "",
  sexo: patient?.sexo || "",
  tipo_sangre: patient?.tipo_sangre || "",
  telefono: patient?.telefono || "",
  email: patient?.email || "",
  direccion: patient?.direccion || "",
  contacto_emergencia_nombre: patient?.contacto_emergencia_nombre || "",
  contacto_emergencia_telefono: patient?.contacto_emergencia_telefono || "",
  alergias_resumen: patient?.alergias_resumen || "",
  consentimiento_datos_personales: Boolean(patient?.consentimiento_datos_personales),
});

const PRIVACY_NOTICE_VERSION = "2026.03-v1";

function PrivacyNoticeModal({ open, onClose, currentUser, clinicConfig }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-slate-800">Aviso de privacidad integral</p>
            <p className="text-xs text-slate-500 font-bold">Version {PRIVACY_NOTICE_VERSION}</p>
          </div>

          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-sm text-slate-600 leading-relaxed">
          <section>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Responsable</p>
            <p className="font-bold text-slate-700">
              {currentUser?.nombre || "Dra. Paulina"} - {clinicConfig?.nombre_consultorio || "Consultorio Cliniq"}
            </p>
            <p>
              Contacto: {clinicConfig?.email_contacto || "doctora@cliniq.lat"} | Tel.{" "}
              {clinicConfig?.telefono || "664 000 0000"}
            </p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Finalidades del tratamiento</p>
            <p>
              Sus datos personales y datos personales sensibles se recaban para integrar expediente clinico,
              brindar atencion medica, dar seguimiento a consultas, emitir recetas, organizar citas, generar
              reportes clinicos y cumplir obligaciones sanitarias y legales aplicables.
            </p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Datos que se recaban</p>
            <p>
              Datos de identificacion, contacto, antecedentes medicos, alergias, signos vitales, diagnosticos,
              tratamientos, estudios, recetas y cualquier informacion necesaria para su atencion medica.
            </p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Derechos ARCO</p>
            <p>
              Usted puede ejercer sus derechos de Acceso, Rectificacion, Cancelacion y Oposicion respecto de sus
              datos personales. Para ello puede solicitarlo directamente en consultorio o mediante escrito libre
              dirigido a la responsable. Su solicitud sera registrada y atendida conforme a la normativa aplicable.
            </p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Confidencialidad</p>
            <p>
              La informacion de salud se considera sensible y sera tratada con medidas administrativas, tecnicas y
              fisicas razonables para proteger su confidencialidad, integridad y disponibilidad.
            </p>
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-black bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function PatientModal({
  open,
  mode,
  patient,
  onClose,
  onSave,
  isSaving,
  nextExternalId,
  currentUser,
  clinicConfig,
}) {
  const [form, setForm] = useState(createInitialForm);
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(createInitialForm());
      return;
    }

    setForm(mode === "edit" ? createFormFromPatient(patient) : createInitialForm());
  }, [open, mode, patient]);

  if (!open) return null;

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : name === "curp" ? normalizeCurp(value) : value,
    }));
  };

  const submit = async () => {
    await onSave({
      nombre: form.nombre.trim(),
      curp: normalizeCurp(form.curp),
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo: form.sexo.trim(),
      tipo_sangre: form.tipo_sangre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      direccion: form.direccion.trim(),
      contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim(),
      contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim(),
      alergias_resumen: form.alergias_resumen.trim(),
      consentimiento_datos_personales: form.consentimiento_datos_personales,
      aviso_privacidad_version: PRIVACY_NOTICE_VERSION,
    });
  };

  const isEdit = mode === "edit";
  const curpIsValid = isValidCurp(form.curp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-teal-100 text-teal-600">
              {isEdit ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">
                {isEdit ? "Editar paciente" : "Nuevo paciente"}
              </p>
              <p className="text-xs text-slate-500 font-bold">
                {isEdit ? "Actualiza informacion del expediente" : "Crea un paciente para agenda y expediente"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          <section className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Datos basicos</p>
              <p className="text-xs text-slate-500 font-bold">Informacion principal del paciente</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Nombre</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={update}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: Ana Garcia"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Fecha de nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={form.fecha_nacimiento}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">CURP</label>
                <input
                  name="curp"
                  value={form.curp}
                  onChange={update}
                  className={`w-full p-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 ${
                    form.curp && !curpIsValid ? "border-red-300" : "border-slate-200"
                  }`}
                  placeholder="Ej: GODE561231HBCRRN09"
                  maxLength={18}
                />
                <p className={`text-[11px] font-bold ${form.curp && !curpIsValid ? "text-red-500" : "text-slate-400"}`}>
                  {form.curp && !curpIsValid
                    ? "La CURP debe tener 18 caracteres con formato oficial mexicano."
                    : "Se valida automaticamente con el formato oficial mexicano."}
                </p>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Sexo</label>
                <select
                  name="sexo"
                  value={form.sexo}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                >
                  <option value="">Selecciona una opcion</option>
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>No binario</option>
                  <option>Prefiero no decir</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tipo de sangre</label>
                <select
                  name="tipo_sangre"
                  value={form.tipo_sangre}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                >
                  <option value="">Selecciona una opcion</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Telefono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: 6641234567"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: paciente@email.com"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">ID externo</label>
                <input
                  value={isEdit ? patient?.external_id || `DB-${patient?.id}` : nextExternalId}
                  readOnly
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-2xl outline-none font-bold text-slate-500"
                />
                <p className="text-[11px] text-slate-400 font-bold">
                  {isEdit ? "Identificador del expediente." : "Se asigna automaticamente en consecutivo."}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-black text-slate-800">Contacto y antecedentes</p>
              <p className="text-xs text-slate-500 font-bold">Informacion complementaria para seguimiento clinico</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Direccion</label>
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: Calle, numero, colonia"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Contacto de emergencia</label>
                <input
                  name="contacto_emergencia_nombre"
                  value={form.contacto_emergencia_nombre}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: Maria Garcia"
                />
              </div>

              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Telefono de emergencia</label>
                <input
                  name="contacto_emergencia_telefono"
                  value={form.contacto_emergencia_telefono}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                  placeholder="Ej: 6647654321"
                />
              </div>

              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase">Alergias</label>
                <textarea
                  name="alergias_resumen"
                  value={form.alergias_resumen}
                  onChange={update}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700 min-h-28 resize-none"
                  placeholder="Ej: Penicilina, polvo, latex..."
                />
              </div>
            </div>
          </section>

          {!isEdit ? (
            <section className="space-y-4">
              <div>
                <p className="text-sm font-black text-slate-800">Aviso de privacidad y consentimiento</p>
                <p className="text-xs text-slate-500 font-bold">
                  Requerido para registrar datos personales sensibles en expediente clinico
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">Consulta el aviso de privacidad integral</p>
                  <p className="text-xs font-bold text-slate-500">Version {PRIVACY_NOTICE_VERSION}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivacyNoticeOpen(true)}
                  className="px-4 py-3 rounded-2xl font-black text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 transition-colors"
                >
                  Ver aviso completo
                </button>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentimiento_datos_personales"
                  checked={form.consentimiento_datos_personales}
                  onChange={update}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-slate-600 leading-relaxed">
                  Confirmo que la paciente acepta el aviso de privacidad y el tratamiento de sus datos
                  personales y datos de salud para fines de atencion medica y resguardo de expediente.
                </span>
              </label>
            </section>
          ) : null}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:text-slate-700"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isSaving || !curpIsValid || (!isEdit && !form.consentimiento_datos_personales)}
            className="px-8 py-3 rounded-2xl font-black bg-teal-600 text-white shadow-xl shadow-teal-200 hover:bg-teal-700 transition-all disabled:opacity-60"
          >
            {isSaving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar paciente"}
          </button>
        </div>
      </div>

      <PrivacyNoticeModal
        open={isPrivacyNoticeOpen}
        onClose={() => setIsPrivacyNoticeOpen(false)}
        currentUser={currentUser}
        clinicConfig={clinicConfig}
      />
    </div>
  );
}

export default function PatientsView({
  patients,
  isLoading,
  error,
  currentUser,
  clinicConfig,
  onCreatePatient,
  onUpdatePatient,
  isCreatingPatient,
  isUpdatingPatient,
  nextExternalId,
  searchQuery,
  setSearchQuery,
  onOpenRecord,
  selectedPatientId,
}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = patients.filter((patient) => {
    const nombre = patient.nombre?.toLowerCase() ?? "";
    const externalId = patient.external_id?.toLowerCase() ?? "";
    const matchesQuery = nombre.includes(normalizedQuery) || externalId.includes(normalizedQuery);

    if (!matchesQuery) return false;
    if (statusFilter === "activos") return !patient.dado_de_baja;
    if (statusFilter === "baja") return Boolean(patient.dado_de_baja);
    return true;
  });

  const handleCreatePatient = async (payload) => {
    const created = await onCreatePatient(payload);
    if (created) {
      setCreateModalOpen(false);
    }
  };

  const handleUpdatePatient = async (payload) => {
    if (!editingPatient) return;
    const updated = await onUpdatePatient(editingPatient, payload);
    if (updated) {
      setEditingPatient(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("todos")}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${
                  statusFilter === "todos" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("activos")}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${
                  statusFilter === "activos"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("baja")}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${
                  statusFilter === "baja" ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Dados de baja
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-teal-700 transition-colors"
            >
              Nuevo Paciente
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-sm font-bold text-red-600 bg-red-50 border-t border-red-100">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="p-8 text-sm font-bold text-slate-500">Cargando pacientes...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-4">Paciente</th>
                <th className="px-8 py-4">ID</th>
                <th className="px-8 py-4">Ultima Visita</th>
                <th className="px-8 py-4">Estado</th>
                <th className="px-8 py-4 text-right">Editar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-8 text-sm font-bold text-slate-500">
                    No hay pacientes que coincidan con la busqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => {
                  const resolvedAge = patient.edad ?? calculateAge(patient.fecha_nacimiento);

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onOpenRecord(patient)}
                      className={`cursor-pointer transition-colors ${
                        selectedPatientId === patient.id
                          ? patient.dado_de_baja
                            ? "bg-red-50/70"
                            : "bg-teal-50/70"
                          : patient.dado_de_baja
                          ? "hover:bg-red-50/60"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                              patient.dado_de_baja ? "bg-red-100 text-red-600" : "bg-teal-100 text-teal-600"
                            }`}
                          >
                            {patient.nombre?.[0] ?? "?"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{patient.nombre}</p>
                            <p className="text-xs text-slate-500">
                              {resolvedAge ?? "Edad N/D"} años | {patient.tipo_sangre || "Tipo N/D"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 font-mono text-xs font-bold text-slate-400">
                        {patient.external_id || `DB-${patient.id}`}
                      </td>

                      <td className="px-8 py-5 text-sm text-slate-600 font-medium">
                        {formatLastVisit(patient.ultima_visita)}
                      </td>

                      <td className="px-8 py-5">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                            patient.dado_de_baja
                              ? "bg-red-100 text-red-600"
                              : patient.activo
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {patient.dado_de_baja ? "Dado de baja" : patient.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingPatient(patient);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          title="Editar paciente"
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <PatientModal
        open={createModalOpen}
        mode="create"
        patient={null}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreatePatient}
        isSaving={isCreatingPatient}
        nextExternalId={nextExternalId}
        currentUser={currentUser}
        clinicConfig={clinicConfig}
      />

      <PatientModal
        open={Boolean(editingPatient)}
        mode="edit"
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSave={handleUpdatePatient}
        isSaving={isUpdatingPatient}
        nextExternalId={nextExternalId}
        currentUser={currentUser}
      />
    </>
  );
}
