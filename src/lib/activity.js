const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "sin fecha";

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSafeText = (value, fallback) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const getPatientLabel = (detail = {}) =>
  getSafeText(detail.paciente_nombre || detail.nombre, "paciente no especificado");

const getUserLabel = (entry) => getSafeText(entry.usuario_nombre, "Sistema");

const getEntityLabel = (entity) => {
  if (entity === "consulta" || entity === "consultas") return "consulta";
  if (entity === "expediente_clinico") return "expediente clinico";
  if (entity === "antecedentes_medicos") return "antecedentes medicos";
  if (entity === "cita") return "cita";
  if (entity === "paciente") return "paciente";
  if (entity === "expediente_pdf") return "expediente PDF";
  if (entity === "receta_pdf") return "receta PDF";
  if (entity === "auth") return "acceso";
  if (String(entity || "").startsWith("arco_")) return "archivo de paciente";
  return getSafeText(entity, "registro");
};

export const activityTypeOptions = [
  { value: "", label: "Todos los eventos" },
  { value: "consultas", label: "Consultas" },
  { value: "expedientes", label: "Expedientes" },
  { value: "agenda", label: "Agenda" },
  { value: "pacientes", label: "Pacientes" },
  { value: "documentos", label: "Documentos" },
  { value: "acceso", label: "Acceso" },
  { value: "otros", label: "Otros" },
];

export const getActivityType = (entry) => {
  const entity = String(entry.entidad || "");
  const action = String(entry.accion || "");

  if (entity === "consulta") return "consultas";
  if (entity === "expediente_clinico" || entity === "consultas" || entity === "antecedentes_medicos") {
    return "expedientes";
  }
  if (entity === "cita") return "agenda";
  if (entity === "paciente" || entity.startsWith("arco_")) return "pacientes";
  if (entity === "expediente_pdf" || entity === "receta_pdf") return "documentos";
  if (action.startsWith("login") || action === "logout" || entity === "auth") return "acceso";
  return "otros";
};

export const getActivityMessage = (entry) => {
  const detail = entry.detalle || {};
  const userName = getUserLabel(entry);
  const patientName = getPatientLabel(detail);
  const diagnosis = getSafeText(detail.diagnostico, "sin diagnostico registrado");
  const motive = getSafeText(detail.motivo, "sin motivo especificado");
  const status = getSafeText(detail.estado, "sin estado especificado");
  const studyName = getSafeText(detail.estudio, "estudio no especificado");

  if (entry.accion === "login_success") return `${userName} inicio sesion correctamente`;
  if (entry.accion === "login_failed") return `Se detecto un intento fallido de inicio de sesion`;
  if (entry.accion === "logout") return `${userName} cerro sesion`;

  if (entry.entidad === "expediente_clinico") {
    return `${userName} reviso el expediente clinico de ${patientName}`;
  }

  if (entry.entidad === "consulta" && entry.accion === "create") {
    return `${userName} registro una consulta para ${patientName} con diagnostico ${diagnosis}`;
  }

  if (entry.entidad === "consulta" && entry.accion === "update") {
    return `${userName} actualizo la consulta de ${patientName} con diagnostico ${diagnosis}`;
  }

  if (entry.entidad === "estudio" && entry.accion === "update") {
    return `${userName} actualizo el estudio ${studyName} de ${patientName} a estado ${status}`;
  }

  if (entry.entidad === "cita" && entry.accion === "create") {
    return `${userName} agendo una cita para ${patientName} con motivo ${motive}`;
  }

  if (entry.entidad === "cita" && entry.accion === "update") {
    return `${userName} actualizo la cita de ${patientName} a estado ${status}`;
  }

  if (entry.entidad === "paciente" && entry.accion === "create") {
    return `${userName} registro al paciente ${patientName}`;
  }

  if (entry.entidad === "paciente" && entry.accion === "update" && detail.dado_de_baja) {
    return `${userName} dio de baja al paciente ${patientName}`;
  }

  if (entry.entidad === "paciente" && entry.accion === "update") {
    return `${userName} actualizo el perfil de ${patientName}`;
  }

  if (entry.entidad === "expediente_pdf") {
    return `${userName} descargo el expediente PDF de ${patientName}`;
  }

  if (entry.entidad === "receta_pdf") {
    return `${userName} descargo la receta PDF de ${patientName}`;
  }

  if (entry.entidad === "consultas" && entry.accion === "read") {
    return `${userName} reviso el historial clinico de ${patientName}`;
  }

  if (entry.accion === "read") {
    return `${userName} reviso ${getEntityLabel(entry.entidad)}${entry.entidad_id ? ` #${entry.entidad_id}` : ""}`;
  }

  if (entry.accion === "create") {
    return `${userName} registro ${getEntityLabel(entry.entidad)}${entry.entidad_id ? ` #${entry.entidad_id}` : ""}`;
  }

  if (entry.accion === "update") {
    return `${userName} actualizo ${getEntityLabel(entry.entidad)}${entry.entidad_id ? ` #${entry.entidad_id}` : ""}`;
  }

  if (entry.accion === "delete") {
    return `${userName} elimino ${getEntityLabel(entry.entidad)}${entry.entidad_id ? ` #${entry.entidad_id}` : ""}`;
  }

  return `${userName} realizo una accion en ${getEntityLabel(entry.entidad)}`;
};

export const getActivityAccent = (entry) => {
  const type = getActivityType(entry);

  if (type === "consultas") return "bg-teal-50 text-teal-700 border-teal-100";
  if (type === "expedientes") return "bg-sky-50 text-sky-700 border-sky-100";
  if (type === "agenda") return "bg-amber-50 text-amber-700 border-amber-100";
  if (type === "pacientes") return "bg-violet-50 text-violet-700 border-violet-100";
  if (type === "documentos") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (type === "acceso") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-100";
};

export const getActivityTypeLabel = (entry) => {
  const type = getActivityType(entry);
  const option = activityTypeOptions.find((item) => item.value === type);
  return option?.label || "Otros";
};

export const getActivityActionLabel = (entry) => {
  if (entry.accion === "create") return "Registro";
  if (entry.accion === "read") return "Consulta";
  if (entry.accion === "update") return "Actualizacion";
  if (entry.accion === "delete") return "Eliminacion";
  if (entry.accion === "login_success") return "Inicio de sesion";
  if (entry.accion === "login_failed") return "Intento fallido";
  if (entry.accion === "logout") return "Cierre de sesion";
  return getSafeText(entry.accion, "Evento");
};

export const getActivityActorLabel = (entry) => getUserLabel(entry);

export const formatActivityDateTime = formatDate;
