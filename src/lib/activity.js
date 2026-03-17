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
  const userName = entry.usuario_nombre || "Sistema";
  const patientName = detail.paciente_nombre || detail.nombre || "paciente sin nombre";
  const diagnosis = detail.diagnostico || "sin diagnostico";
  const motive = detail.motivo || "sin motivo";
  const status = detail.estado || "sin estado";

  if (entry.accion === "login_success") return `${userName} inicio sesion correctamente`;
  if (entry.accion === "login_failed") return `Se detecto un intento fallido de inicio de sesion`;
  if (entry.accion === "logout") return `${userName} cerro sesion`;

  if (entry.entidad === "expediente_clinico") {
    return `${userName} abrio el expediente de ${patientName}`;
  }

  if (entry.entidad === "consulta" && entry.accion === "create") {
    return `Se registro consulta para ${patientName} - ${diagnosis}`;
  }

  if (entry.entidad === "consulta" && entry.accion === "update") {
    return `Se edito la consulta de ${patientName} - ${diagnosis}`;
  }

  if (entry.entidad === "estudio" && entry.accion === "update") {
    return `Se actualizo el estudio ${detail.estudio || "sin nombre"} de ${patientName} a estado ${detail.estado || "sin estado"}`;
  }

  if (entry.entidad === "cita" && entry.accion === "create") {
    return `Se agendo cita para ${detail.paciente_nombre || patientName} - ${motive}`;
  }

  if (entry.entidad === "cita" && entry.accion === "update") {
    return `${detail.paciente_nombre || patientName} fue actualizado en agenda a estado ${status}`;
  }

  if (entry.entidad === "paciente" && entry.accion === "create") {
    return `Se registro el paciente ${patientName}`;
  }

  if (entry.entidad === "paciente" && entry.accion === "update" && detail.dado_de_baja) {
    return `${patientName} fue dado de baja de la agenda clinica`;
  }

  if (entry.entidad === "paciente" && entry.accion === "update") {
    return `Se actualizo el perfil de ${patientName}`;
  }

  if (entry.entidad === "expediente_pdf") {
    return `${userName} descargo el expediente PDF de ${patientName}`;
  }

  if (entry.entidad === "receta_pdf") {
    return `${userName} descargo la receta PDF de ${patientName}`;
  }

  if (entry.entidad === "consultas" && entry.accion === "read") {
    return `${userName} consulto el historial clinico de ${patientName}`;
  }

  return `${userName} realizo ${entry.accion} en ${entry.entidad}`;
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

export const formatActivityDateTime = formatDate;
