import express from "express";
import cors from "cors";
import crypto from "crypto";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { pool, ensureSchema } from "./db.js";

process.env.TZ = process.env.TZ || "America/Tijuana";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../dist");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 4000;
const jwtSecret = process.env.JWT_SECRET || "Paupediente-dev-secret";
const privacyNoticeVersion = process.env.PRIVACY_NOTICE_VERSION || "2026.03-v1";
const curpRegex =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
const antecedentTypes = [
  "Heredofamiliares",
  "Patologicos",
  "Quirurgicos",
  "Alergicos",
  "Gineco-obstetricos",
  "No patologicos",
  "Habitos",
];
const defaultClinicInfo = {
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
  logo_data_url: null,
};
const defaultSaasConfig = {
  smtp_host: "",
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  leads_notify_email: "",
};
const rapidApiCedulaConfig = {
  url:
    process.env.RAPIDAPI_CEDULAS_URL
    || "https://cedulas-profesionales-sep.p.rapidapi.com/api/v1/sep/cedula",
  host:
    process.env.RAPIDAPI_CEDULAS_HOST
    || "cedulas-profesionales-sep.p.rapidapi.com",
  key: process.env.RAPIDAPI_CEDULAS_KEY || "",
};
const allowedMedicalProfessionTerms = [
  "MEDICO",
  "MÉDICO",
  "MEDICO CIRUJANO",
  "MÉDICO CIRUJANO",
  "CIRUJANO Y PARTERO",
  "DOCTOR EN MEDICINA",
];
const verificationStatuses = ["pending", "approved", "rejected"];
const subscriptionStatuses = ["not_started", "trialing", "active", "past_due", "canceled", "unpaid", "incomplete"];
const accessStatuses = [
  "pending_onboarding",
  "pending_verification",
  "pending_payment",
  "active",
  "limited",
  "suspended",
  "blocked",
];
const billingCycles = ["monthly", "quarterly", "semiannual", "annual", "custom"];
const paymentStatuses = ["paid", "pending", "failed", "refunded", "waived", "offline"];

app.use(cors());
app.use(express.json({ limit: "6mb" }));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

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

const getDayRange = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const calculateMinimumRetentionDate = (lastVisitValue) => {
  if (!lastVisitValue) return null;

  const date = new Date(lastVisitValue);
  if (Number.isNaN(date.getTime())) return null;

  const retention = new Date(date);
  retention.setFullYear(retention.getFullYear() + 5);
  return retention.toISOString();
};

const normalizeCurp = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const normalizePhone = (value) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .trim();

const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const isAllowedMedicalProfession = (profession) => {
  const normalizedProfession = normalizeSearchText(profession);
  return allowedMedicalProfessionTerms.some((term) => normalizedProfession.includes(normalizeSearchText(term)));
};

const buildFullName = (...parts) =>
  parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");

const parseOptionalAmount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const parseOptionalDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeDoctorPlatformProfile = (doctor) => ({
  id: doctor.id,
  nombre: doctor.nombre,
  email: doctor.email,
  slug: doctor.slug,
  rol: doctor.rol,
  cedula_profesional: doctor.cedula_profesional,
  activo: doctor.activo,
  created_at: doctor.created_at,
  updated_at: doctor.updated_at,
  verification_status: doctor.verification_status || "pending",
  verification_notes: doctor.verification_notes || "",
  verification_checked_at: doctor.verification_checked_at,
  verification_checked_by_name: doctor.verification_checked_by_name || "",
  subscription_status: doctor.subscription_status || "not_started",
  billing_plan_code: doctor.billing_plan_code || "",
  billing_cycle: doctor.billing_cycle || "monthly",
  billing_amount: doctor.billing_amount === null || doctor.billing_amount === undefined ? null : Number(doctor.billing_amount),
  billing_currency: doctor.billing_currency || "MXN",
  stripe_customer_id: doctor.stripe_customer_id || "",
  stripe_subscription_id: doctor.stripe_subscription_id || "",
  billing_current_period_start: doctor.billing_current_period_start,
  billing_current_period_end: doctor.billing_current_period_end,
  billing_trial_ends_at: doctor.billing_trial_ends_at,
  billing_last_payment_at: doctor.billing_last_payment_at,
  billing_last_payment_status: doctor.billing_last_payment_status || "",
  billing_cancel_at_period_end: Boolean(doctor.billing_cancel_at_period_end),
  manual_access_until: doctor.manual_access_until,
  manual_billing_override: Boolean(doctor.manual_billing_override),
  manual_override_reason: doctor.manual_override_reason || "",
  access_status: doctor.access_status || "pending_verification",
  saas_notes: doctor.saas_notes || "",
});

const buildDoctorAccessSummary = (doctor) => {
  const now = Date.now();
  const manualAccessUntil = doctor.manual_access_until ? new Date(doctor.manual_access_until).getTime() : null;
  const currentPeriodEnd = doctor.billing_current_period_end ? new Date(doctor.billing_current_period_end).getTime() : null;
  const trialEndsAt = doctor.billing_trial_ends_at ? new Date(doctor.billing_trial_ends_at).getTime() : null;

  if (!doctor.activo) {
    return {
      effective_status: "blocked",
      reason: "Cuenta desactivada manualmente",
    };
  }

  if (doctor.access_status === "blocked") {
    return {
      effective_status: "blocked",
      reason: "Bloqueado manualmente por administracion",
    };
  }

  if (doctor.verification_status !== "approved") {
    return {
      effective_status: doctor.access_status === "suspended" ? "suspended" : "pending_verification",
      reason: "Credenciales medicas pendientes o rechazadas",
    };
  }

  if (manualAccessUntil && manualAccessUntil >= now) {
    return {
      effective_status: "active",
      reason: "Acceso extendido manualmente",
    };
  }

  if (doctor.subscription_status === "active" && currentPeriodEnd && currentPeriodEnd >= now) {
    return {
      effective_status: doctor.access_status === "limited" ? "limited" : "active",
      reason: "Suscripcion al corriente",
    };
  }

  if (doctor.subscription_status === "trialing" && trialEndsAt && trialEndsAt >= now) {
    return {
      effective_status: "active",
      reason: "Periodo de prueba vigente",
    };
  }

  if (doctor.subscription_status === "past_due") {
    return {
      effective_status: doctor.access_status === "suspended" ? "suspended" : "limited",
      reason: "Pago pendiente de regularizacion",
    };
  }

  if (doctor.subscription_status === "not_started") {
    return {
      effective_status: "pending_payment",
      reason: "Suscripcion aun no activada",
    };
  }

  return {
    effective_status: doctor.access_status === "suspended" ? "suspended" : "suspended",
    reason: "Suscripcion vencida o sin acceso vigente",
  };
};

const fetchSepLicenseData = async (cedula) => {
  const normalizedCedula = String(cedula ?? "").replace(/\D/g, "").trim();

  if (!/^\d{7,8}$/.test(normalizedCedula)) {
    return {
      valid: false,
      cedula: normalizedCedula,
      isMedicalDoctor: false,
      message: "La cedula debe contener 7 u 8 digitos",
    };
  }

  if (!rapidApiCedulaConfig.key) {
    throw new Error("RapidAPI no configurado. Define RAPIDAPI_CEDULAS_KEY en el servidor");
  }

  const url = new URL(rapidApiCedulaConfig.url);
  url.searchParams.set("cedula", normalizedCedula);

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(12_000),
    headers: {
      "x-rapidapi-host": rapidApiCedulaConfig.host,
      "x-rapidapi-key": rapidApiCedulaConfig.key,
    },
  });

  if (!response.ok) {
    throw new Error(`RapidAPI lookup ${response.status}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const record = rows.find((item) => String(item?.cedula || "").trim() === normalizedCedula) || rows[0];

  if (!record) {
    return {
      valid: false,
      cedula: normalizedCedula,
      isMedicalDoctor: false,
      message: "No se encontro informacion para esa cedula en SEP",
    };
  }

  const fullName = buildFullName(record.nombre, record.primerApellido, record.segundoApellido);
  const profession = String(record.profesion || record.carrera || "").trim();
  const isMedicalDoctor = isAllowedMedicalProfession(profession);

  return {
    valid: true,
    cedula: String(record.cedula || normalizedCedula).trim(),
    isMedicalDoctor,
    message: isMedicalDoctor
      ? "Cedula validada contra SEP"
      : "La cedula existe, pero no corresponde a una profesion medica permitida",
    fullName,
    firstName: String(record.nombre || "").trim(),
    paternalLastName: String(record.primerApellido || "").trim(),
    maternalLastName: String(record.segundoApellido || "").trim(),
    profession,
    institution: String(record.institucion || "").trim(),
    institutionState: String(record.entidadInstitucion || "").trim(),
    registrationYear: String(record.anioRegistro || "").trim(),
    expeditionDate: String(record.fechaExpedicion || "").trim(),
    raw: record,
  };
};

const isValidCurp = (value) => curpRegex.test(normalizeCurp(value));

const isValidAntecedentType = (value) => antecedentTypes.includes(String(value || "").trim());

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
};

const signJwt = (payload, expiresInSeconds = 60 * 60 * 8) => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
};

const verifyJwt = (token) => {
  const [encodedHeader, encodedBody, signature] = token.split(".");
  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error("Malformed token");
  }

  const data = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (signature !== expectedSignature) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [scheme, salt, hash] = String(storedHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
};

const generateConsultationSignature = ({
  paciente_id,
  fecha,
  motivo,
  padecimiento_actual,
  interrogatorio_aparatos_sistemas,
  descripcion_fisica,
  diagnostico,
  cie10_codigo,
  cie10_descripcion,
  pronostico,
  plan_tratamiento,
  signos,
  notas,
  medico_id,
  timestamp,
}) => {
  const payload = JSON.stringify({
    paciente_id: paciente_id ?? null,
    fecha: fecha ?? null,
    motivo: motivo ?? null,
    padecimiento_actual: padecimiento_actual ?? null,
    interrogatorio_aparatos_sistemas: interrogatorio_aparatos_sistemas ?? null,
    descripcion_fisica: descripcion_fisica ?? null,
    diagnostico: diagnostico ?? null,
    cie10_codigo: cie10_codigo ?? null,
    cie10_descripcion: cie10_descripcion ?? null,
    pronostico: pronostico ?? null,
    plan_tratamiento: plan_tratamiento ?? null,
    signos: signos ?? {},
    notas: notas ?? null,
    medico_id: medico_id ?? null,
    timestamp,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
};

const writeAuditLog = async (db, user, accion, entidad, entidadId, detalle = {}) => {
  await db.query(
    `INSERT INTO audit_log (
      usuario_id, usuario_nombre, accion, entidad, entidad_id, detalle
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      user?.id ?? null,
      user?.nombre ?? null,
      accion,
      entidad,
      entidadId ?? null,
      JSON.stringify(detalle),
    ]
  );
};

const requireDoctorAccess = (req, res, next) => {
  if (!["admin", "medico"].includes(req.user?.rol)) {
    return res.status(403).json({
      error: "forbidden",
      message: "No tienes permisos para acceder a la bitacora",
    });
  }

  return next();
};

const sanitizePdfText = (value) =>
  String(value ?? "")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildExplorationText = (consultation) => {
  if (consultation.descripcion_fisica) {
    return String(consultation.descripcion_fisica).trim();
  }

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

const normalizeWorkingSchedule = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const normalized = {};

  for (let day = 0; day <= 6; day += 1) {
    const base = defaultClinicInfo.horario_laboral[day];
    const current = source[day] || source[String(day)] || {};
    normalized[day] = {
      activo: typeof current.activo === "boolean" ? current.activo : base.activo,
      inicio:
        typeof current.inicio === "string" && /^\d{2}:\d{2}$/.test(current.inicio)
          ? current.inicio
          : base.inicio,
      fin:
        typeof current.fin === "string" && /^\d{2}:\d{2}$/.test(current.fin)
          ? current.fin
          : base.fin,
    };
  }

  return normalized;
};

const getClinicConfig = async (db = pool) => {
  const result = await db.query(
    `SELECT
       id,
       nombre_consultorio,
       direccion,
       telefono,
       email_contacto,
       cedula_profesional,
       especialidad,
       zona_horaria,
       horario_laboral,
       logo_data_url
     FROM configuracion_consultorio
     WHERE id = 1`
  );

  return {
    ...defaultClinicInfo,
    ...(result.rows[0] || {}),
    horario_laboral: normalizeWorkingSchedule(result.rows[0]?.horario_laboral),
  };
};

const normalizeSaasConfig = (value = {}) => ({
  smtp_host: String(value.smtp_host || "").trim(),
  smtp_port: Number(value.smtp_port) > 0 ? Number(value.smtp_port) : defaultSaasConfig.smtp_port,
  smtp_secure: Boolean(value.smtp_secure),
  smtp_user: String(value.smtp_user || "").trim(),
  smtp_password: String(value.smtp_password || "").trim(),
  smtp_from_email: String(value.smtp_from_email || "").trim(),
  leads_notify_email: String(value.leads_notify_email || "").trim(),
});

const getSaasConfig = async (db = pool) => {
  const result = await db.query(
    `SELECT
       id,
       smtp_host,
       smtp_port,
       smtp_secure,
       smtp_user,
       smtp_password,
       smtp_from_email,
       leads_notify_email
     FROM saas_configuracion
     WHERE id = 1`
  );

  return normalizeSaasConfig({
    ...defaultSaasConfig,
    ...(result.rows[0] || {}),
  });
};

const maskSaasConfig = (config) => ({
  ...normalizeSaasConfig(config),
  smtp_password: config?.smtp_password ? "********" : "",
  smtp_password_configured: Boolean(String(config?.smtp_password || "").trim()),
});

const sendLeadNotificationEmail = async (lead, saasConfig) => {
  const config = normalizeSaasConfig(saasConfig);

  if (!config.smtp_host || !config.smtp_user || !config.smtp_password || !config.leads_notify_email) {
    return { sent: false, skipped: true, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_password,
    },
  });

  const fromAddress = config.smtp_from_email || config.smtp_user;

  await transporter.sendMail({
    from: fromAddress,
    to: config.leads_notify_email,
    replyTo: lead.email,
    subject: `Nuevo lead demo: ${lead.nombre}`,
    text: [
      "Se recibio una nueva solicitud de demo.",
      "",
      `Nombre: ${lead.nombre}`,
      `Email: ${lead.email}`,
      `Telefono: ${lead.telefono || "Sin telefono"}`,
      `Especialidad: ${lead.especialidad || "Sin especialidad"}`,
      `Fecha: ${new Date(lead.fecha || new Date()).toLocaleString("es-MX")}`,
    ].join("\n"),
  });

  return { sent: true, skipped: false };
};

const parseLogoBuffer = (logoDataUrl) => {
  const value = String(logoDataUrl || "");
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
};

const applyClinicTimezone = (timezone) => {
  const normalized = String(timezone || "").trim() || defaultClinicInfo.zona_horaria;
  process.env.TZ = normalized;
  return normalized;
};

const isBlockingAppointmentStatus = (status) => !["Cancelado", "No asistio"].includes(String(status || ""));

const generatePublicAvailability = (appointments, workingSchedule = defaultClinicInfo.horario_laboral) => {
  const slots = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const normalizedAppointments = appointments
    .filter((appointment) => isBlockingAppointmentStatus(appointment.estado))
    .map((appointment) => {
      const start = new Date(appointment.start);
      const end = addMinutes(start, Number(appointment.duracion) || 30);
      return { start, end };
    })
    .filter((appointment) => !Number.isNaN(appointment.start.getTime()));

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = addMinutes(startDate, dayOffset * 24 * 60);
    const dayOfWeek = day.getDay();
    const schedule = workingSchedule[dayOfWeek] || workingSchedule[String(dayOfWeek)];
    if (!schedule?.activo) continue;

    const [startHour, startMinute] = String(schedule.inicio || "09:00").split(":").map(Number);
    const [endHour, endMinute] = String(schedule.fin || "17:00").split(":").map(Number);

    const dayStart = new Date(day);
    dayStart.setHours(startHour || 0, startMinute || 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(endHour || 0, endMinute || 0, 0, 0);

    for (let slotStart = new Date(dayStart); addMinutes(slotStart, 60) <= dayEnd; slotStart = addMinutes(slotStart, 60)) {
      if (slotStart < new Date()) continue;

      const slotEnd = addMinutes(slotStart, 60);
      const overlaps = normalizedAppointments.some(
        (appointment) => slotStart < appointment.end && slotEnd > appointment.start
      );

      if (!overlaps) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          duracion: 60,
        });
      }
    }
  }

  return slots;
};

const getNextExternalIdFromDb = async (db = pool) => {
  const result = await db.query(
    `SELECT COALESCE(MAX((regexp_match(external_id, '^PX-([0-9]+)$'))[1]::int), 1000) AS max_number
     FROM pacientes
     WHERE external_id ~ '^PX-([0-9]+)$'`
  );

  const nextNumber = Number(result.rows[0]?.max_number || 1000) + 1;
  return `PX-${String(nextNumber).padStart(4, "0")}`;
};

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token requerido",
    });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch (error) {
    return res.status(401).json({
      error: "unauthorized",
      message: error.message === "Token expired" ? "Token expirado" : "Token invalido",
    });
  }

  const userResult = await pool.query(
    `SELECT id, nombre, email, rol, cedula_profesional, activo,
            verification_status, subscription_status, access_status,
            billing_current_period_end, billing_trial_ends_at, manual_access_until
     FROM usuarios
     WHERE id = $1`,
    [payload.sub]
  );

  if (userResult.rowCount === 0 || !userResult.rows[0].activo) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Usuario no valido",
    });
  }

  req.user = userResult.rows[0];
  next();
});

const requireOwnerAuth = asyncHandler(async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token owner requerido",
    });
  }

  let payload;

  try {
    payload = verifyJwt(token);
  } catch {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token owner invalido",
    });
  }

  if (payload.scope !== "saas_owner") {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token owner invalido",
    });
  }

  const ownerResult = await pool.query(
    `SELECT id, nombre, email, activo
     FROM saas_owner_users
     WHERE id = $1`,
    [payload.sub]
  );

  if (ownerResult.rowCount === 0 || !ownerResult.rows[0].activo) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Owner no valido",
    });
  }

  req.owner = ownerResult.rows[0];
  next();
});

app.get("/api/health", asyncHandler(async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, nombre, email, password_hash, rol, cedula_profesional, activo,
            verification_status, subscription_status, access_status,
            billing_current_period_end, billing_trial_ends_at, manual_access_until
     FROM usuarios
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    await writeAuditLog(
      pool,
      { id: null, nombre: normalizedEmail || "desconocido" },
      "login_failed",
      "auth",
      null,
      { email: normalizedEmail }
    );
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Correo o contrasena incorrectos",
    });
  }

  const user = result.rows[0];

  if (!user.activo || !verifyPassword(String(password || ""), user.password_hash)) {
    await writeAuditLog(
      pool,
      { id: user.id, nombre: user.nombre },
      "login_failed",
      "auth",
      user.id,
      { email: normalizedEmail }
    );
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Correo o contrasena incorrectos",
    });
  }

  const token = signJwt({
    sub: user.id,
    email: user.email,
    rol: user.rol,
  });

  await writeAuditLog(
    pool,
    { id: user.id, nombre: user.nombre },
    "login_success",
    "auth",
    user.id,
    { email: user.email }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      cedula_profesional: user.cedula_profesional,
      verification_status: user.verification_status,
      subscription_status: user.subscription_status,
      access_status: user.access_status,
      billing_current_period_end: user.billing_current_period_end,
      billing_trial_ends_at: user.billing_trial_ends_at,
      manual_access_until: user.manual_access_until,
    },
  });
}));

app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

app.get("/api/billing/me", requireDoctorAccess, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       id,
       nombre,
       email,
       slug,
       rol,
       cedula_profesional,
       activo,
       created_at,
       updated_at,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       billing_plan_code,
       billing_cycle,
       billing_amount,
       billing_currency,
       stripe_customer_id,
       stripe_subscription_id,
       billing_current_period_start,
       billing_current_period_end,
       billing_trial_ends_at,
       billing_last_payment_at,
       billing_last_payment_status,
       billing_cancel_at_period_end,
       manual_access_until,
       manual_billing_override,
       manual_override_reason,
       access_status,
       saas_notes
     FROM usuarios
     WHERE id = $1`,
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Perfil de facturacion no encontrado",
    });
  }

  const doctor = result.rows[0];

  res.json({
    ...normalizeDoctorPlatformProfile(doctor),
    access_summary: buildDoctorAccessSummary(doctor),
  });
}));

app.post("/api/auth/logout", requireAuth, asyncHandler(async (req, res) => {
  await writeAuditLog(
    pool,
    req.user,
    "logout",
    "auth",
    req.user.id,
    { email: req.user.email }
  );

  res.json({ ok: true });
}));

app.post("/api/owner/auth/login", asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  const result = await pool.query(
    `SELECT id, nombre, email, password_hash, activo
     FROM saas_owner_users
     WHERE LOWER(email) = $1`,
    [email]
  );

  if (result.rowCount === 0 || !result.rows[0].activo || !verifyPassword(password, result.rows[0].password_hash)) {
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Credenciales owner incorrectas",
    });
  }

  const owner = result.rows[0];
  const token = signJwt(
    {
      sub: owner.id,
      email: owner.email,
      scope: "saas_owner",
    },
    60 * 60 * 12
  );

  res.json({
    token,
    owner: {
      id: owner.id,
      nombre: owner.nombre,
      email: owner.email,
    },
  });
}));

app.get("/api/owner/auth/me", requireOwnerAuth, asyncHandler(async (req, res) => {
  res.json({
    owner: {
      id: req.owner.id,
      nombre: req.owner.nombre,
      email: req.owner.email,
    },
  });
}));

app.post("/api/owner/auth/logout", requireOwnerAuth, asyncHandler(async (req, res) => {
  res.json({ ok: true });
}));

app.get("/api/owner/config", requireOwnerAuth, asyncHandler(async (req, res) => {
  const config = await getSaasConfig(pool);

  res.json(maskSaasConfig(config));
}));

app.put("/api/owner/config", requireOwnerAuth, asyncHandler(async (req, res) => {
  const currentConfig = await getSaasConfig(pool);
  const incomingPassword = String(req.body?.smtp_password || "").trim();
  const normalized = normalizeSaasConfig({
    ...req.body,
    smtp_password: incomingPassword ? incomingPassword : currentConfig.smtp_password,
  });

  const result = await pool.query(
    `INSERT INTO saas_configuracion (
      id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_email, leads_notify_email
    )
    VALUES (1, $1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      smtp_host = EXCLUDED.smtp_host,
      smtp_port = EXCLUDED.smtp_port,
      smtp_secure = EXCLUDED.smtp_secure,
      smtp_user = EXCLUDED.smtp_user,
      smtp_password = EXCLUDED.smtp_password,
      smtp_from_email = EXCLUDED.smtp_from_email,
      leads_notify_email = EXCLUDED.leads_notify_email
    RETURNING *`,
    [
      normalized.smtp_host || null,
      normalized.smtp_port,
      normalized.smtp_secure,
      normalized.smtp_user || null,
      normalized.smtp_password || null,
      normalized.smtp_from_email || null,
      normalized.leads_notify_email || null,
    ]
  );

  res.json(maskSaasConfig(result.rows[0]));
}));

app.get("/api/owner/doctors", requireOwnerAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       id,
       nombre,
       email,
       slug,
       rol,
       cedula_profesional,
       activo,
       created_at,
       updated_at,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       billing_plan_code,
       billing_cycle,
       billing_amount,
       billing_currency,
       stripe_customer_id,
       stripe_subscription_id,
       billing_current_period_start,
       billing_current_period_end,
       billing_trial_ends_at,
       billing_last_payment_at,
       billing_last_payment_status,
       billing_cancel_at_period_end,
       manual_access_until,
       manual_billing_override,
       manual_override_reason,
       access_status,
       saas_notes
     FROM usuarios
     WHERE rol IN ('admin', 'medico')
     ORDER BY created_at DESC, id DESC`
  );

  res.json(result.rows.map((doctor) => ({
    ...normalizeDoctorPlatformProfile(doctor),
    access_summary: buildDoctorAccessSummary(doctor),
  })));
}));

app.post("/api/owner/doctors/validate-license", requireOwnerAuth, asyncHandler(async (req, res) => {
  const cedula = String(req.body?.cedula_profesional || req.body?.cedula || "").trim();
  const result = await fetchSepLicenseData(cedula);

  if (!result.valid) {
    return res.status(404).json(result);
  }

  res.json(result);
}));

app.get("/api/owner/leads", requireOwnerAuth, asyncHandler(async (req, res) => {
  const safeLimit = Math.max(1, Math.min(Number(req.query?.limit) || 100, 500));
  const result = await pool.query(
    `SELECT id, nombre, email, telefono, especialidad, estado, notas, fecha, created_at
     FROM leads
     ORDER BY fecha DESC, id DESC
     LIMIT ${safeLimit}`
  );

  res.json(result.rows);
}));

app.put("/api/owner/leads/:id", requireOwnerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedStatuses = ["nuevo", "contactado", "demo_agendada", "cerrado"];
  const estado = allowedStatuses.includes(String(req.body?.estado || ""))
    ? String(req.body.estado)
    : "nuevo";
  const notas = String(req.body?.notas || "").trim();

  const result = await pool.query(
    `UPDATE leads
     SET estado = $1,
         notas = $2
     WHERE id = $3
     RETURNING id, nombre, email, telefono, especialidad, estado, notas, fecha, created_at`,
    [estado, notas || null, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Lead no encontrado",
    });
  }

  res.json(result.rows[0]);
}));

app.post("/api/owner/doctors", requireOwnerAuth, asyncHandler(async (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();
  const rol = ["admin", "medico"].includes(String(req.body?.rol || "")) ? String(req.body.rol) : "medico";
  const cedula = String(req.body?.cedula_profesional || "").trim();
  const requestedSlug = String(req.body?.slug || "").trim().toLowerCase();
  const baseSlug = requestedSlug || email.split("@")[0] || `medico-${Date.now()}`;
  const slug = baseSlug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `medico-${Date.now()}`;

  if (!nombre || !email || !password || !cedula) {
    return res.status(400).json({
      error: "validation_error",
      message: "Nombre, email, password y cedula son obligatorios",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "validation_error",
      message: "La password inicial debe tener al menos 8 caracteres",
    });
  }

  const licenseValidation = await fetchSepLicenseData(cedula);

  if (!licenseValidation.valid) {
    return res.status(400).json({
      error: "license_validation_failed",
      message: licenseValidation.message || "No se pudo validar la cedula en SEP",
    });
  }

  if (!licenseValidation.isMedicalDoctor) {
    return res.status(400).json({
      error: "license_not_medical",
      message: "La cedula existe, pero no corresponde a una profesion medica permitida",
      license: licenseValidation,
    });
  }

  const result = await pool.query(
    `INSERT INTO usuarios (
       nombre,
       email,
       slug,
       password_hash,
       rol,
       cedula_profesional,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       access_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'Validado al crear medico desde owner console', NOW(), $7, 'not_started', 'pending_payment')
     RETURNING
       id,
       nombre,
       email,
       slug,
       rol,
       cedula_profesional,
       activo,
       created_at,
       updated_at,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       billing_plan_code,
       billing_cycle,
       billing_amount,
       billing_currency,
       stripe_customer_id,
       stripe_subscription_id,
       billing_current_period_start,
       billing_current_period_end,
       billing_trial_ends_at,
       billing_last_payment_at,
       billing_last_payment_status,
       billing_cancel_at_period_end,
       manual_access_until,
       manual_billing_override,
       manual_override_reason,
       access_status,
       saas_notes`,
    [nombre, email, slug, hashPassword(password), rol, cedula || null, req.owner.nombre]
  );

  const createdDoctor = result.rows[0];

  res.status(201).json({
    ...normalizeDoctorPlatformProfile(createdDoctor),
    access_summary: buildDoctorAccessSummary(createdDoctor),
  });
}));

app.put("/api/owner/doctors/:id", requireOwnerAuth, asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);

  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({
      error: "validation_error",
      message: "Doctor invalido",
    });
  }

  const currentResult = await pool.query(
    `SELECT
       id,
       nombre,
       email,
       slug,
       rol,
       cedula_profesional,
       activo,
       created_at,
       updated_at,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       billing_plan_code,
       billing_cycle,
       billing_amount,
       billing_currency,
       stripe_customer_id,
       stripe_subscription_id,
       billing_current_period_start,
       billing_current_period_end,
       billing_trial_ends_at,
       billing_last_payment_at,
       billing_last_payment_status,
       billing_cancel_at_period_end,
       manual_access_until,
       manual_billing_override,
       manual_override_reason,
       access_status,
       saas_notes
     FROM usuarios
     WHERE id = $1
       AND rol IN ('admin', 'medico')`,
    [doctorId]
  );

  if (currentResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Medico no encontrado",
    });
  }

  const currentDoctor = currentResult.rows[0];
  const verificationStatus = verificationStatuses.includes(String(req.body?.verification_status || ""))
    ? String(req.body.verification_status)
    : currentDoctor.verification_status;
  const subscriptionStatus = subscriptionStatuses.includes(String(req.body?.subscription_status || ""))
    ? String(req.body.subscription_status)
    : currentDoctor.subscription_status;
  const accessStatus = accessStatuses.includes(String(req.body?.access_status || ""))
    ? String(req.body.access_status)
    : currentDoctor.access_status;
  const billingCycle = billingCycles.includes(String(req.body?.billing_cycle || ""))
    ? String(req.body.billing_cycle)
    : currentDoctor.billing_cycle;
  const lastPaymentStatus = req.body?.billing_last_payment_status === ""
    ? null
    : paymentStatuses.includes(String(req.body?.billing_last_payment_status || ""))
      ? String(req.body.billing_last_payment_status)
      : currentDoctor.billing_last_payment_status;
  const billingAmount = req.body?.billing_amount === ""
    ? null
    : parseOptionalAmount(req.body?.billing_amount) ?? currentDoctor.billing_amount;
  const updatedDoctorResult = await pool.query(
    `UPDATE usuarios
     SET nombre = $1,
         email = $2,
         slug = $3,
         rol = $4,
         cedula_profesional = $5,
         activo = $6,
         verification_status = $7,
         verification_notes = $8,
         verification_checked_at = CASE WHEN $9 THEN NOW() ELSE verification_checked_at END,
         verification_checked_by_name = CASE WHEN $9 THEN $10 ELSE verification_checked_by_name END,
         subscription_status = $11,
         billing_plan_code = $12,
         billing_cycle = $13,
         billing_amount = $14,
         billing_currency = $15,
         stripe_customer_id = $16,
         stripe_subscription_id = $17,
         billing_current_period_start = $18,
         billing_current_period_end = $19,
         billing_trial_ends_at = $20,
         billing_last_payment_at = $21,
         billing_last_payment_status = $22,
         billing_cancel_at_period_end = $23,
         manual_access_until = $24,
         manual_billing_override = $25,
         manual_override_reason = $26,
         access_status = $27,
         saas_notes = $28
     WHERE id = $29
     RETURNING
       id,
       nombre,
       email,
       slug,
       rol,
       cedula_profesional,
       activo,
       created_at,
       updated_at,
       verification_status,
       verification_notes,
       verification_checked_at,
       verification_checked_by_name,
       subscription_status,
       billing_plan_code,
       billing_cycle,
       billing_amount,
       billing_currency,
       stripe_customer_id,
       stripe_subscription_id,
       billing_current_period_start,
       billing_current_period_end,
       billing_trial_ends_at,
       billing_last_payment_at,
       billing_last_payment_status,
       billing_cancel_at_period_end,
       manual_access_until,
       manual_billing_override,
       manual_override_reason,
       access_status,
       saas_notes`,
    [
      String(req.body?.nombre ?? currentDoctor.nombre).trim() || currentDoctor.nombre,
      String(req.body?.email ?? currentDoctor.email).trim().toLowerCase() || currentDoctor.email,
      String(req.body?.slug ?? currentDoctor.slug ?? "").trim().toLowerCase() || currentDoctor.slug,
      ["admin", "medico"].includes(String(req.body?.rol || "")) ? String(req.body.rol) : currentDoctor.rol,
      String(req.body?.cedula_profesional ?? currentDoctor.cedula_profesional ?? "").trim() || null,
      Boolean(req.body?.activo ?? currentDoctor.activo),
      verificationStatus,
      String(req.body?.verification_notes ?? currentDoctor.verification_notes ?? "").trim() || null,
      verificationStatus !== currentDoctor.verification_status,
      req.owner.nombre,
      subscriptionStatus,
      String(req.body?.billing_plan_code ?? currentDoctor.billing_plan_code ?? "").trim() || null,
      billingCycle,
      billingAmount,
      String(req.body?.billing_currency ?? currentDoctor.billing_currency ?? "MXN").trim().toUpperCase() || "MXN",
      String(req.body?.stripe_customer_id ?? currentDoctor.stripe_customer_id ?? "").trim() || null,
      String(req.body?.stripe_subscription_id ?? currentDoctor.stripe_subscription_id ?? "").trim() || null,
      req.body?.billing_current_period_start === ""
        ? null
        : parseOptionalDateTime(req.body?.billing_current_period_start) ?? currentDoctor.billing_current_period_start,
      req.body?.billing_current_period_end === ""
        ? null
        : parseOptionalDateTime(req.body?.billing_current_period_end) ?? currentDoctor.billing_current_period_end,
      req.body?.billing_trial_ends_at === ""
        ? null
        : parseOptionalDateTime(req.body?.billing_trial_ends_at) ?? currentDoctor.billing_trial_ends_at,
      req.body?.billing_last_payment_at === ""
        ? null
        : parseOptionalDateTime(req.body?.billing_last_payment_at) ?? currentDoctor.billing_last_payment_at,
      lastPaymentStatus,
      Boolean(req.body?.billing_cancel_at_period_end ?? currentDoctor.billing_cancel_at_period_end),
      req.body?.manual_access_until === ""
        ? null
        : parseOptionalDateTime(req.body?.manual_access_until) ?? currentDoctor.manual_access_until,
      Boolean(req.body?.manual_billing_override ?? currentDoctor.manual_billing_override),
      String(req.body?.manual_override_reason ?? currentDoctor.manual_override_reason ?? "").trim() || null,
      accessStatus,
      String(req.body?.saas_notes ?? currentDoctor.saas_notes ?? "").trim() || null,
      doctorId,
    ]
  );

  const updatedDoctor = updatedDoctorResult.rows[0];

  await writeAuditLog(
    pool,
    { id: null, nombre: req.owner.nombre },
    "update",
    "owner_doctor_account",
    doctorId,
    {
      verification_status: updatedDoctor.verification_status,
      subscription_status: updatedDoctor.subscription_status,
      access_status: updatedDoctor.access_status,
      active: updatedDoctor.activo,
    }
  );

  res.json({
    ...normalizeDoctorPlatformProfile(updatedDoctor),
    access_summary: buildDoctorAccessSummary(updatedDoctor),
  });
}));

app.get("/api/portal/:token", asyncHandler(async (req, res) => {
  const { token } = req.params;

  const patientResult = await pool.query(
    `SELECT
       id,
       external_id,
       portal_token,
       nombre,
       sexo,
       edad,
       fecha_nacimiento,
       tipo_sangre,
       telefono,
       email,
       alergias_resumen,
       ultima_visita,
       dado_de_baja,
       fecha_baja,
       motivo_baja
     FROM pacientes
     WHERE portal_token::text = $1`,
    [String(token || "").trim()]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Portal de paciente no encontrado",
    });
  }

  const patient = patientResult.rows[0];
  const now = new Date();
  const questionnaireWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [appointmentsResult, consultationsResult, pendingPaymentsResult] = await Promise.all([
    pool.query(
      `SELECT
         c.id,
         c.motivo,
         c.tipo,
         c.estado,
         c.start,
         c.duracion,
         c.notas,
         qp.id AS cuestionario_id,
         qp.motivo_consulta AS cuestionario_motivo_consulta,
         qp.sintomas_actuales AS cuestionario_sintomas_actuales,
         qp.medicamentos_actuales AS cuestionario_medicamentos_actuales,
         qp.alergias_conocidas AS cuestionario_alergias_conocidas,
         qp.cambios_desde_ultima_visita AS cuestionario_cambios_desde_ultima_visita,
         qp.updated_at AS cuestionario_actualizado_at
       FROM citas c
       LEFT JOIN cuestionarios_previos qp ON qp.cita_id = c.id
       WHERE c.paciente_id = $1
       ORDER BY start DESC, id DESC`,
      [patient.id]
    ),
        pool.query(
          `SELECT
             id,
             fecha,
             motivo,
             paciente_nombre_snapshot,
             paciente_edad_snapshot,
             paciente_sexo_snapshot,
             diagnostico,
             cie10_codigo,
             cie10_descripcion,
         plan_tratamiento,
         signos,
         medico_nombre,
         medico_cedula,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                'id', r.id,
                'medicamento', r.medicamento,
                'dosis', r.dosis,
                'via_administracion', r.via_administracion,
                'frecuencia_cantidad', r.frecuencia_cantidad,
                 'frecuencia_unidad', r.frecuencia_unidad,
                 'duracion_cantidad', r.duracion_cantidad,
                 'duracion_unidad', r.duracion_unidad,
                 'indicaciones', r.indicaciones
               )
               ORDER BY r.id ASC
             )
             FROM recetas r
             WHERE r.consulta_id = consultas.id
           ),
           '[]'
         ) AS recetas
       FROM consultas
       WHERE paciente_id = $1
       ORDER BY fecha DESC, id DESC`,
      [patient.id]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(monto) FILTER (WHERE estado = 'Pendiente'), 0)::numeric(10,2) AS saldo_pendiente,
         COALESCE(
           json_agg(
             json_build_object(
               'id', id,
               'cita_id', cita_id,
               'monto', monto,
               'estado', estado,
               'metodo_pago', metodo_pago,
               'fecha', fecha
             )
             ORDER BY fecha DESC, id DESC
           ) FILTER (WHERE estado = 'Pendiente'),
           '[]'::json
         ) AS pendientes
       FROM pagos
       WHERE paciente_id = $1`,
      [patient.id]
    ),
  ]);

  const appointments = appointmentsResult.rows;
  const upcomingQuestionnaireAppointment =
    appointments.find((appointment) => {
      const start = new Date(appointment.start);
      return (
        !Number.isNaN(start.getTime()) &&
        start >= now &&
        start <= questionnaireWindowEnd &&
        !["Cancelado", "Completado", "No asistio"].includes(appointment.estado)
      );
    }) || null;

  res.json({
    paciente: patient,
    citas: appointments,
    consultas: consultationsResult.rows,
    pagos: {
      saldo_pendiente: Number(pendingPaymentsResult.rows[0]?.saldo_pendiente || 0),
      pendientes: pendingPaymentsResult.rows[0]?.pendientes || [],
    },
    cuestionario_previo: upcomingQuestionnaireAppointment
      ? {
          visible: true,
          cita_id: upcomingQuestionnaireAppointment.id,
          fecha_cita: upcomingQuestionnaireAppointment.start,
          respondido: Boolean(upcomingQuestionnaireAppointment.cuestionario_id),
          respuestas: upcomingQuestionnaireAppointment.cuestionario_id
            ? {
                motivo_consulta: upcomingQuestionnaireAppointment.cuestionario_motivo_consulta || "",
                sintomas_actuales: upcomingQuestionnaireAppointment.cuestionario_sintomas_actuales || "",
                medicamentos_actuales: upcomingQuestionnaireAppointment.cuestionario_medicamentos_actuales || "",
                alergias_conocidas: upcomingQuestionnaireAppointment.cuestionario_alergias_conocidas || "",
                cambios_desde_ultima_visita:
                  upcomingQuestionnaireAppointment.cuestionario_cambios_desde_ultima_visita || "",
                updated_at: upcomingQuestionnaireAppointment.cuestionario_actualizado_at || null,
              }
            : null,
        }
      : {
          visible: false,
          cita_id: null,
          fecha_cita: null,
          respondido: false,
          respuestas: null,
        },
  });
}));

app.get("/api/portal/:token/recetas", asyncHandler(async (req, res) => {
  const { token } = req.params;

  const patientResult = await pool.query(
    `SELECT id, nombre, external_id, portal_token
     FROM pacientes
     WHERE portal_token::text = $1`,
    [String(token || "").trim()]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Portal de paciente no encontrado",
    });
  }

  const patient = patientResult.rows[0];

  const recipesResult = await pool.query(
    `SELECT
       r.id,
       r.consulta_id,
       r.medicamento,
       r.presentacion,
       r.dosis,
       r.via_administracion,
       r.frecuencia_cantidad,
       r.frecuencia_unidad,
       r.duracion_cantidad,
       r.duracion_unidad,
       r.indicaciones,
       r.created_at,
       c.fecha AS consulta_fecha,
       c.diagnostico,
       c.cie10_codigo,
       c.cie10_descripcion,
       c.medico_nombre
     FROM recetas r
     INNER JOIN consultas c ON c.id = r.consulta_id
     WHERE c.paciente_id = $1
     ORDER BY c.fecha DESC, r.id DESC`,
    [patient.id]
  );

  res.json({
    paciente: patient,
    recetas: recipesResult.rows,
  });
}));

app.get("/api/portal/curp/:curp", asyncHandler(async (req, res) => {
  res.status(410).json({
    error: "disabled_route",
    message: "El acceso por CURP fue deshabilitado. Solicita a tu medico el enlace privado con token para abrir tu expediente.",
  });
}));

app.post("/api/leads", asyncHandler(async (req, res) => {
  const nombre = String(req.body?.nombre || "").trim();
  const email = String(req.body?.email || "").trim();
  const telefono = String(req.body?.telefono || "").trim();
  const especialidad = String(req.body?.especialidad || "").trim();

  if (!nombre || !email) {
    return res.status(400).json({
      error: "validation_error",
      message: "Nombre y email son obligatorios",
    });
  }

  const result = await pool.query(
    `INSERT INTO leads (nombre, email, telefono, especialidad, fecha)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, nombre, email, telefono, especialidad, fecha`,
    [nombre, email, telefono || null, especialidad || null]
  );

  const lead = result.rows[0];
  let emailStatus = { sent: false, skipped: true, reason: "smtp_not_configured" };

  try {
    const saasConfig = await getSaasConfig(pool);
    emailStatus = await sendLeadNotificationEmail(lead, saasConfig);
  } catch (notifyError) {
    console.error("Lead email notification failed", notifyError);
    emailStatus = {
      sent: false,
      skipped: false,
      reason: "smtp_send_failed",
    };
  }

  res.status(201).json({
    lead,
    email_notification: emailStatus,
    message: "Lead registrada correctamente",
  });
}));

app.post("/api/portal/:token/citas/:id/cancelar", asyncHandler(async (req, res) => {
  const { token, id } = req.params;

  const patientResult = await pool.query(
    `SELECT id
     FROM pacientes
     WHERE portal_token::text = $1`,
    [String(token || "").trim()]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Portal de paciente no encontrado",
    });
  }

  const patientId = patientResult.rows[0].id;

  const result = await pool.query(
    `UPDATE citas
     SET estado = 'Cancelado'
     WHERE id = $1
       AND paciente_id = $2
       AND estado <> 'Completado'
     RETURNING id, paciente_id, motivo, tipo, estado, start, duracion, notas`,
    [id, patientId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Cita no encontrada o ya no se puede cancelar",
    });
  }

  res.json(result.rows[0]);
}));

app.post("/api/portal/:token/cuestionarios", asyncHandler(async (req, res) => {
  const { token } = req.params;
  const {
    cita_id,
    motivo_consulta,
    sintomas_actuales,
    medicamentos_actuales,
    alergias_conocidas,
    cambios_desde_ultima_visita,
  } = req.body;

  const patientResult = await pool.query(
    `SELECT id
     FROM pacientes
     WHERE portal_token::text = $1`,
    [String(token || "").trim()]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Portal de paciente no encontrado",
    });
  }

  const patientId = patientResult.rows[0].id;
  const appointmentResult = await pool.query(
    `SELECT id
     FROM citas
     WHERE id = $1
       AND paciente_id = $2`,
    [cita_id, patientId]
  );

  if (appointmentResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Cita no encontrada para este paciente",
    });
  }

  const result = await pool.query(
    `INSERT INTO cuestionarios_previos (
       cita_id,
       paciente_id,
       motivo_consulta,
       sintomas_actuales,
       medicamentos_actuales,
       alergias_conocidas,
       cambios_desde_ultima_visita
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (cita_id) DO UPDATE SET
       motivo_consulta = EXCLUDED.motivo_consulta,
       sintomas_actuales = EXCLUDED.sintomas_actuales,
       medicamentos_actuales = EXCLUDED.medicamentos_actuales,
       alergias_conocidas = EXCLUDED.alergias_conocidas,
       cambios_desde_ultima_visita = EXCLUDED.cambios_desde_ultima_visita
     RETURNING *`,
    [
      cita_id,
      patientId,
      String(motivo_consulta || "").trim(),
      String(sintomas_actuales || "").trim(),
      String(medicamentos_actuales || "").trim(),
      String(alergias_conocidas || "").trim(),
      String(cambios_desde_ultima_visita || "").trim(),
    ]
  );

  res.status(201).json(result.rows[0]);
}));

app.get("/api/portal/:token/consultas/:id/receta-pdf", asyncHandler(async (req, res) => {
  const { token, id } = req.params;
  const clinicConfig = await getClinicConfig(pool);

  const consultationResult = await pool.query(
    `SELECT
       c.*,
       p.id AS paciente_id,
       p.nombre AS paciente_nombre,
       p.edad AS paciente_edad,
       p.fecha_nacimiento,
       p.external_id,
       p.portal_token,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', r.id,
               'medicamento', r.medicamento,
               'presentacion', r.presentacion,
               'dosis', r.dosis,
               'via_administracion', r.via_administracion,
               'frecuencia_cantidad', r.frecuencia_cantidad,
               'frecuencia_unidad', r.frecuencia_unidad,
               'duracion_cantidad', r.duracion_cantidad,
               'duracion_unidad', r.duracion_unidad,
               'indicaciones', r.indicaciones
             )
           )
           FROM recetas r
           WHERE r.consulta_id = c.id
         ),
         '[]'
       ) AS recetas
     FROM consultas c
     INNER JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.id = $1
       AND p.portal_token::text = $2`,
    [id, String(token || "").trim()]
  );

  if (consultationResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Consulta no encontrada",
    });
  }

  const consultation = consultationResult.rows[0];
  const patientName = consultation.paciente_nombre_snapshot || consultation.paciente_nombre || "Sin paciente";
  const patientAge =
    consultation.paciente_edad_snapshot ??
    consultation.paciente_edad ??
    calculateAge(consultation.fecha_nacimiento) ??
    "Sin registro";
  const patientSex = consultation.paciente_sexo_snapshot || "Sin registro";
  const recetas = Array.isArray(consultation.recetas) ? consultation.recetas : [];
  const diagnosis = consultation.cie10_codigo
    ? `${consultation.cie10_codigo} - ${consultation.cie10_descripcion || consultation.diagnostico || "Sin diagnostico"}`
    : consultation.diagnostico || "Sin diagnostico";
  const folio = `REC-${consultation.external_id || consultation.paciente_id}-${consultation.id}`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receta-${sanitizePdfText(folio)}.pdf"`
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.pipe(res);

  const logoBuffer = parseLogoBuffer(clinicConfig.logo_data_url);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 50, 45, { fit: [55, 55], align: "left" });
    } catch {
      // Ignore invalid logo content and continue rendering PDF.
    }
  }

  doc.fontSize(20).fillColor("#0f766e").text(sanitizePdfText(clinicConfig.nombre_consultorio), {
    align: "left",
  });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor("#475569")
    .text(`Direccion: ${sanitizePdfText(clinicConfig.direccion)}`);
  doc.text(`Telefono: ${sanitizePdfText(clinicConfig.telefono)}`);
  doc.text(`Email: ${sanitizePdfText(clinicConfig.email_contacto)}`);
  doc.text(
    `Medico: ${sanitizePdfText(consultation.medico_nombre || "Sin medico")} | Cedula: ${sanitizePdfText(
      consultation.medico_cedula || clinicConfig.cedula_profesional
    )}`
  );

  doc.moveDown();
    doc.fontSize(11).fillColor("#0f172a").text(`Paciente: ${sanitizePdfText(patientName)}`);
    doc.text(`Edad: ${sanitizePdfText(patientAge)}`);
    doc.text(`Sexo: ${sanitizePdfText(patientSex)}`);
    doc.text(`Fecha: ${sanitizePdfText(new Date(consultation.fecha).toLocaleString("es-MX"))}`);
  doc.moveDown();
  doc.fontSize(12).fillColor("#0f766e").text("Diagnostico CIE-10");
  doc.fontSize(11).fillColor("#0f172a").text(sanitizePdfText(diagnosis));
  doc.moveDown();
  doc.fontSize(12).fillColor("#0f766e").text("Pronostico");
  doc.fontSize(11).fillColor("#0f172a").text(sanitizePdfText(consultation.pronostico || "Sin pronostico registrado"));
  doc.moveDown();
  doc.fontSize(12).fillColor("#0f766e").text("Medicamentos");
  doc.moveDown(0.4);

  if (!recetas.length) {
    doc.fontSize(10).fillColor("#475569").text("Sin medicamentos registrados.");
  } else {
    recetas.forEach((item) => {
      doc
        .fontSize(10)
        .fillColor("#0f172a")
        .text(`- ${sanitizePdfText(item.medicamento)} | Dosis: ${sanitizePdfText(item.dosis || "Sin dosis")} | Via: ${sanitizePdfText(item.via_administracion || "Sin via especificada")}`);
      doc
        .fontSize(9)
        .fillColor("#475569")
        .text(
          `  Frecuencia: ${sanitizePdfText(
            item.frecuencia_cantidad
              ? `Cada ${item.frecuencia_cantidad} ${item.frecuencia_unidad || ""}`
              : "Sin pauta"
          )} | Duracion: ${sanitizePdfText(
            item.duracion_cantidad ? `${item.duracion_cantidad} ${item.duracion_unidad || ""}` : "Sin definir"
          )}`
        );
      if (item.indicaciones) {
        doc.text(`  Indicaciones: ${sanitizePdfText(item.indicaciones)}`);
      }
      doc.moveDown(0.4);
    });
  }

  doc.moveDown(2);
  doc.fontSize(10).fillColor("#0f172a").text("________________________________", { align: "right" });
  doc.text("Firma del medico", { align: "right" });
  doc.moveDown();
  doc.fontSize(9).fillColor("#64748b").text(`Emitida: ${sanitizePdfText(new Date().toLocaleString("es-MX"))}`);
  doc.text(`Folio: ${sanitizePdfText(folio)}`);
  doc.end();
}));

app.get("/api/agenda-publica/:slug", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const clinicConfig = await getClinicConfig(pool);
  applyClinicTimezone(clinicConfig.zona_horaria);
  const doctorResult = await pool.query(
    `SELECT id, nombre, slug, rol, activo, foto_data_url, cedula_profesional
     FROM usuarios
     WHERE slug = $1
       AND rol IN ('admin', 'medico')
       AND activo = TRUE
     LIMIT 1`,
    [String(slug || "").trim().toLowerCase()]
  );

  if (doctorResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Agenda publica no encontrada",
    });
  }

  const doctor = doctorResult.rows[0];
  const appointmentsResult = await pool.query(
    `SELECT id, start, duracion, estado
     FROM citas
     WHERE start >= $1
     ORDER BY start ASC`,
    [new Date().toISOString()]
  );

  res.json({
    medico: {
      id: doctor.id,
      nombre: doctor.nombre,
      slug: doctor.slug,
      especialidad: clinicConfig.especialidad || defaultClinicInfo.especialidad,
      foto_data_url: doctor.foto_data_url || null,
      cedula_profesional: doctor.cedula_profesional || clinicConfig.cedula_profesional,
      consultorio: clinicConfig.nombre_consultorio,
      telefono: clinicConfig.telefono,
      direccion: clinicConfig.direccion,
      email_contacto: clinicConfig.email_contacto,
      zona_horaria: clinicConfig.zona_horaria,
      logo_data_url: clinicConfig.logo_data_url || null,
    },
    slots: generatePublicAvailability(
      appointmentsResult.rows,
      normalizeWorkingSchedule(clinicConfig.horario_laboral)
    ),
  });
}));

app.get("/api/agenda-publica/:slug/paciente", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedCurp = normalizeCurp(req.query.curp);

  const doctorResult = await pool.query(
    `SELECT id
     FROM usuarios
     WHERE slug = $1
       AND rol IN ('admin', 'medico')
       AND activo = TRUE
     LIMIT 1`,
    [normalizedSlug]
  );

  if (doctorResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Agenda publica no encontrada",
    });
  }

  if (!normalizedCurp || !isValidCurp(normalizedCurp)) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP invalida",
    });
  }

  const patientResult = await pool.query(
    `SELECT
       id,
       external_id,
       portal_token,
       nombre,
       curp,
       fecha_nacimiento,
       sexo,
       telefono,
       email
     FROM pacientes
     WHERE curp = $1
     ORDER BY id DESC
     LIMIT 1`,
    [normalizedCurp]
  );

  res.json({
    exists: patientResult.rowCount > 0,
    curp: normalizedCurp,
    patient: patientResult.rows[0] || null,
  });
}));

app.post("/api/agenda-publica/:slug/solicitar", asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    curp,
    nombre,
    fecha_nacimiento,
    sexo,
    telefono,
    email,
    motivo,
    start,
  } = req.body;

  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedCurp = normalizeCurp(curp);
  const normalizedPhone = normalizePhone(telefono);
  const normalizedName = String(nombre || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedReason = String(motivo || "").trim();

  if (!normalizedSlug || !normalizedCurp || !normalizedReason || !start) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP, motivo y horario son requeridos",
    });
  }

  if (!isValidCurp(normalizedCurp)) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP invalida",
    });
  }

  const doctorResult = await pool.query(
    `SELECT id, nombre, slug, rol, activo
     FROM usuarios
     WHERE slug = $1
       AND rol IN ('admin', 'medico')
       AND activo = TRUE
     LIMIT 1`,
    [normalizedSlug]
  );

  if (doctorResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Agenda publica no encontrada",
    });
  }

  const slotStart = new Date(start);
  if (Number.isNaN(slotStart.getTime()) || slotStart < new Date()) {
    return res.status(400).json({
      error: "validation_error",
      message: "Horario no valido",
    });
  }

  const slotEnd = addMinutes(slotStart, 60);
  const conflictsResult = await pool.query(
    `SELECT id
     FROM citas
     WHERE estado NOT IN ('Cancelado', 'No asistio')
       AND start < $2
       AND (start + make_interval(mins => duracion)) > $1
     LIMIT 1`,
    [slotStart.toISOString(), slotEnd.toISOString()]
  );

  if (conflictsResult.rowCount > 0) {
    return res.status(409).json({
      error: "slot_unavailable",
      message: "Ese horario ya no esta disponible",
    });
  }

  const existingPatientResult = await pool.query(
    `SELECT *
     FROM pacientes
     WHERE curp = $1
     ORDER BY id DESC
     LIMIT 1`,
    [normalizedCurp]
  );

  let patient = existingPatientResult.rows[0] || null;
  if (!patient) {
    if (!normalizedName || !fecha_nacimiento || !String(sexo || "").trim() || !normalizedPhone) {
      return res.status(400).json({
        error: "validation_error",
        message: "Para pacientes nuevos se requieren nombre, fecha de nacimiento, sexo y telefono",
      });
    }

    const nextExternalId = await getNextExternalIdFromDb(pool);
    const calculatedAge = calculateAge(fecha_nacimiento);
    const createdPatientResult = await pool.query(
      `INSERT INTO pacientes (
         external_id,
         nombre,
         curp,
         edad,
         fecha_nacimiento,
         sexo,
         telefono,
         email,
         consentimiento_datos_personales,
         consentimiento_at,
         aviso_privacidad_version,
         aviso_privacidad_aceptado_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NULL, NULL, NULL)
       RETURNING *`,
      [
        nextExternalId,
        normalizedName,
        normalizedCurp,
        calculatedAge,
        fecha_nacimiento,
        String(sexo).trim(),
        normalizedPhone,
        normalizedEmail || null,
      ]
    );
    patient = createdPatientResult.rows[0];
  }

  const appointmentResult = await pool.query(
    `INSERT INTO citas (paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion)
     VALUES ($1, $2, $3, $4, 'En espera', $5, 60)
     RETURNING *`,
    [
      patient.id,
      patient.nombre || normalizedName,
      normalizedReason,
      existingPatientResult.rowCount > 0 ? "Seguimiento" : "Primera vez",
      slotStart.toISOString(),
    ]
  );

  await writeAuditLog(
    pool,
    { id: null, nombre: "agenda-publica" },
    "create",
    "cita_publica",
    appointmentResult.rows[0].id,
    {
      doctor_slug: normalizedSlug,
      paciente_id: patient.id,
      paciente_nombre: patient.nombre,
      curp: normalizedCurp,
      telefono: patient.telefono || normalizedPhone,
      motivo: normalizedReason,
      estado: "En espera",
    }
  );

  res.status(201).json({
    cita: appointmentResult.rows[0],
    paciente: {
      id: patient.id,
      nombre: patient.nombre,
      portal_token: patient.portal_token,
      external_id: patient.external_id,
    },
    portal_token: patient.portal_token,
  });
}));

app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/health") ||
    req.path.startsWith("/auth/") ||
    req.path.startsWith("/owner/") ||
    req.path.startsWith("/portal/") ||
    req.path.startsWith("/agenda-publica/") ||
    req.path.startsWith("/leads")
  ) {
    return next();
  }
  return requireAuth(req, res, next);
});

app.get("/api/dashboard/summary", asyncHandler(async (req, res) => {
  const { start: todayStart, end: tomorrowStart } = getDayRange();
  const now = new Date();

  const [
    patientsResult,
    consultationsTodayResult,
    appointmentsTodayResult,
    upcomingAppointmentsResult,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS total FROM pacientes WHERE activo = TRUE"),
    pool.query(
      "SELECT COUNT(*)::int AS total FROM consultas WHERE fecha >= $1 AND fecha < $2",
      [todayStart.toISOString(), tomorrowStart.toISOString()]
    ),
    pool.query(
      "SELECT COUNT(*)::int AS total FROM citas WHERE start >= $1 AND start < $2 AND estado <> 'Cancelado'",
      [todayStart.toISOString(), tomorrowStart.toISOString()]
    ),
    pool.query(
      `SELECT
         id,
         paciente_id,
         paciente_nombre,
         motivo,
         tipo,
         estado,
         start,
         duracion
       FROM citas
       WHERE start >= $1
       ORDER BY start ASC
       LIMIT 5`,
      [now.toISOString()]
    ),
  ]);

  res.json({
    stats: {
      total_pacientes: patientsResult.rows[0]?.total ?? 0,
      consultas_hoy: consultationsTodayResult.rows[0]?.total ?? 0,
      citas_hoy: appointmentsTodayResult.rows[0]?.total ?? 0,
      proximas_citas: upcomingAppointmentsResult.rowCount,
    },
    proximas_citas: upcomingAppointmentsResult.rows,
  });
}));

app.get("/api/configuracion-consultorio", asyncHandler(async (req, res) => {
  const config = await getClinicConfig(pool);

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "configuracion_consultorio",
    1,
    {}
  );

  res.json(config);
}));

app.put("/api/configuracion-consultorio", requireDoctorAccess, asyncHandler(async (req, res) => {
  const {
    nombre_consultorio,
    direccion,
    telefono,
    email_contacto,
    cedula_profesional,
    especialidad,
    zona_horaria,
    horario_laboral,
    logo_data_url,
  } = req.body;

  const result = await pool.query(
    `INSERT INTO configuracion_consultorio (
      id, nombre_consultorio, direccion, telefono, email_contacto,
      cedula_profesional, especialidad, zona_horaria, horario_laboral, logo_data_url
    )
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
    ON CONFLICT (id) DO UPDATE SET
      nombre_consultorio = EXCLUDED.nombre_consultorio,
      direccion = EXCLUDED.direccion,
      telefono = EXCLUDED.telefono,
      email_contacto = EXCLUDED.email_contacto,
      cedula_profesional = EXCLUDED.cedula_profesional,
      especialidad = EXCLUDED.especialidad,
      zona_horaria = EXCLUDED.zona_horaria,
      horario_laboral = EXCLUDED.horario_laboral,
      logo_data_url = EXCLUDED.logo_data_url
    RETURNING id, nombre_consultorio, direccion, telefono, email_contacto, cedula_profesional, especialidad, zona_horaria, horario_laboral, logo_data_url`,
    [
      String(nombre_consultorio || defaultClinicInfo.nombre_consultorio).trim(),
      String(direccion || defaultClinicInfo.direccion).trim(),
      String(telefono || defaultClinicInfo.telefono).trim(),
      String(email_contacto || defaultClinicInfo.email_contacto).trim(),
      String(cedula_profesional || defaultClinicInfo.cedula_profesional).trim(),
      String(especialidad || defaultClinicInfo.especialidad).trim(),
      String(zona_horaria || defaultClinicInfo.zona_horaria).trim(),
      JSON.stringify(normalizeWorkingSchedule(horario_laboral)),
      logo_data_url ? String(logo_data_url) : null,
    ]
  );

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "configuracion_consultorio",
    1,
    {}
  );

  res.json(result.rows[0]);
}));

app.get("/api/pacientes", asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM pacientes ORDER BY id DESC LIMIT 100");

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "pacientes",
    null,
    { total: result.rowCount }
  );

  res.json(result.rows);
}));

app.get("/api/cie10", asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();

  const result = query
    ? await pool.query(
        `SELECT codigo, descripcion
         FROM cie10
         WHERE seleccionable = TRUE
           AND (codigo ILIKE $1 OR descripcion ILIKE $1)
         ORDER BY
           CASE WHEN codigo ILIKE $2 THEN 0 ELSE 1 END,
           codigo ASC
         LIMIT 10`,
        [`%${query}%`, `${query}%`]
      )
    : await pool.query(
        `SELECT codigo, descripcion
         FROM cie10
         WHERE seleccionable = TRUE
         ORDER BY codigo ASC
         LIMIT 10`
      );

  res.json(result.rows);
}));

app.get("/api/pacientes/:id/datos", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [patientResult, antecedentesResult, consultasResult, solicitudesResult] = await Promise.all([
    pool.query("SELECT * FROM pacientes WHERE id = $1", [id]),
    pool.query(
      `SELECT id, tipo, descripcion, created_at, updated_at
       FROM antecedentes_medicos
       WHERE paciente_id = $1
         AND dado_de_baja = FALSE
       ORDER BY created_at DESC, id DESC`,
      [id]
    ),
      pool.query(
        `SELECT
           id,
           fecha,
           motivo,
           diagnostico,
           cie10_codigo,
           cie10_descripcion,
           pronostico,
           interrogatorio_aparatos_sistemas,
           firma_hash,
           firma_timestamp,
           descripcion_fisica,
           habitus_exterior,
           exploracion_cabeza,
           exploracion_cuello,
           exploracion_torax,
           exploracion_abdomen,
           exploracion_extremidades,
           exploracion_genitales,
           plan_tratamiento,
           signos,
           notas,
           created_at,
           updated_at,
           medico_nombre,
           medico_cedula
         FROM consultas
         WHERE paciente_id = $1
         ORDER BY fecha DESC`,
      [id]
    ),
    pool.query(
      `SELECT id, tipo, descripcion, estado, fecha_solicitud, fecha_respuesta
       FROM solicitudes_arco
       WHERE paciente_id = $1
       ORDER BY fecha_solicitud DESC, id DESC`,
      [id]
    ),
  ]);

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "arco_acceso",
    Number(id),
    {
      paciente_id: Number(id),
    }
  );

  res.json({
    paciente: patientResult.rows[0],
    antecedentes: antecedentesResult.rows,
    consultas: consultasResult.rows,
    solicitudes_arco: solicitudesResult.rows,
  });
}));

app.get("/api/pacientes/:id/antecedentes", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT id, paciente_id, tipo, descripcion, created_at, updated_at
     FROM antecedentes_medicos
     WHERE paciente_id = $1
       AND dado_de_baja = FALSE
     ORDER BY created_at DESC, id DESC`,
    [id]
  );

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "antecedentes_medicos",
    Number(id),
    {
      paciente_id: Number(id),
      total: result.rowCount,
    }
  );

  res.json(result.rows);
}));

app.post("/api/pacientes/:id/open-record", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patientResult = await pool.query(
    `SELECT nombre, external_id
     FROM pacientes
     WHERE id = $1`,
    [id]
  );

  const patient = patientResult.rows[0] || null;

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "expediente_clinico",
    Number(id),
    {
      paciente_id: Number(id),
      paciente_nombre: patient?.nombre || null,
      external_id: patient?.external_id || null,
    }
  );

  res.json({ ok: true });
}));

app.post("/api/pacientes/:id/antecedentes", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tipo, descripcion } = req.body;

  if (!String(tipo || "").trim() || !String(descripcion || "").trim()) {
    return res.status(400).json({
      error: "validation_error",
      message: "Tipo y descripcion son requeridos",
    });
  }

  if (!isValidAntecedentType(tipo)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Tipo de antecedente no valido",
    });
  }

  const result = await pool.query(
    `INSERT INTO antecedentes_medicos (paciente_id, tipo, descripcion)
     VALUES ($1, $2, $3)
     RETURNING id, paciente_id, tipo, descripcion, created_at, updated_at`,
    [id, String(tipo).trim(), String(descripcion).trim()]
  );

  await writeAuditLog(
    pool,
    req.user,
    "create",
    "antecedente_medico",
    result.rows[0].id,
    {
      paciente_id: Number(id),
      tipo: result.rows[0].tipo,
    }
  );

  res.status(201).json(result.rows[0]);
}));

app.put("/api/antecedentes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tipo, descripcion } = req.body;

  if (!String(tipo || "").trim() || !String(descripcion || "").trim()) {
    return res.status(400).json({
      error: "validation_error",
      message: "Tipo y descripcion son requeridos",
    });
  }

  if (!isValidAntecedentType(tipo)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Tipo de antecedente no valido",
    });
  }

  const result = await pool.query(
    `UPDATE antecedentes_medicos
     SET
       tipo = $1,
       descripcion = $2
     WHERE id = $3
       AND dado_de_baja = FALSE
     RETURNING id, paciente_id, tipo, descripcion, created_at, updated_at`,
    [String(tipo).trim(), String(descripcion).trim(), id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Antecedente no encontrado",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "antecedente_medico",
    result.rows[0].id,
    {
      paciente_id: result.rows[0].paciente_id,
      tipo: result.rows[0].tipo,
    }
  );

  res.json(result.rows[0]);
}));

app.delete("/api/antecedentes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE antecedentes_medicos
     SET
       dado_de_baja = TRUE,
       fecha_baja = NOW()
     WHERE id = $1
       AND dado_de_baja = FALSE
     RETURNING id, paciente_id, tipo, descripcion`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Antecedente no encontrado",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "delete",
    "antecedente_medico",
    result.rows[0].id,
    {
      paciente_id: result.rows[0].paciente_id,
      tipo: result.rows[0].tipo,
    }
  );

  res.json({
    deleted: false,
    antecedente: result.rows[0],
  });
}));

app.post("/api/pacientes", asyncHandler(async (req, res) => {
  const {
    external_id,
    portal_token,
    nombre,
    curp,
    edad,
    fecha_nacimiento,
    tipo_sangre,
    sexo,
    telefono,
    email,
    direccion,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    alergias_resumen,
    consentimiento_datos_personales,
    aviso_privacidad_version,
    ultima_visita,
  } = req.body;

  if (consentimiento_datos_personales !== true) {
    return res.status(400).json({
      error: "validation_error",
      message: "Debes aceptar el aviso de privacidad y consentimiento de datos",
    });
  }

  if (String(aviso_privacidad_version || "").trim() !== privacyNoticeVersion) {
    return res.status(400).json({
      error: "validation_error",
      message: "Debes aceptar la version vigente del aviso de privacidad",
    });
  }

  const normalizedCurp = normalizeCurp(curp);
  if (!normalizedCurp || !isValidCurp(normalizedCurp)) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP invalida",
    });
  }

  const calculatedAge = calculateAge(fecha_nacimiento);

  const fechaMinimaConservacion = calculateMinimumRetentionDate(ultima_visita);

  const result = await pool.query(
    `INSERT INTO pacientes (
      external_id, portal_token, nombre, curp, edad, fecha_nacimiento, tipo_sangre, sexo,
      telefono, email, direccion, contacto_emergencia_nombre,
      contacto_emergencia_telefono, alergias_resumen,
      consentimiento_datos_personales, consentimiento_at,
      aviso_privacidad_version, aviso_privacidad_aceptado_at, ultima_visita,
      fecha_minima_conservacion
    )
     VALUES ($1, COALESCE($2::uuid, gen_random_uuid()), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      external_id,
      portal_token ?? null,
      nombre,
      normalizedCurp,
      calculatedAge ?? edad ?? null,
      fecha_nacimiento ?? null,
      tipo_sangre ?? null,
      sexo ?? null,
      telefono ?? null,
      email ?? null,
      direccion ?? null,
      contacto_emergencia_nombre ?? null,
      contacto_emergencia_telefono ?? null,
      alergias_resumen ?? null,
      true,
      new Date().toISOString(),
      privacyNoticeVersion,
      new Date().toISOString(),
      ultima_visita ?? null,
      fechaMinimaConservacion,
    ]
  );

  await writeAuditLog(
    pool,
    req.user,
    "create",
    "paciente",
    result.rows[0].id,
    {
      nombre: result.rows[0].nombre,
      external_id: result.rows[0].external_id,
    }
  );

  res.status(201).json(result.rows[0]);
}));

app.put("/api/pacientes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    curp,
    edad,
    fecha_nacimiento,
    tipo_sangre,
    sexo,
    telefono,
    email,
    direccion,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    alergias_resumen,
    ultima_visita,
    activo,
    dado_de_baja,
    fecha_baja,
    motivo_baja,
  } = req.body;

  const normalizedCurp = normalizeCurp(curp);
  if (!normalizedCurp || !isValidCurp(normalizedCurp)) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP invalida",
    });
  }

  const calculatedAge = calculateAge(fecha_nacimiento);
  const fechaMinimaConservacion = calculateMinimumRetentionDate(ultima_visita);

  const result = await pool.query(
    `UPDATE pacientes
     SET
       nombre = $1,
       curp = $2,
       edad = $3,
       fecha_nacimiento = $4,
       tipo_sangre = $5,
       sexo = $6,
       telefono = $7,
       email = $8,
       direccion = $9,
       contacto_emergencia_nombre = $10,
       contacto_emergencia_telefono = $11,
       alergias_resumen = $12,
       ultima_visita = $13,
       activo = COALESCE($14, activo),
       dado_de_baja = COALESCE($15, dado_de_baja),
       fecha_baja = $16,
       motivo_baja = $17,
       fecha_minima_conservacion = $18
     WHERE id = $19
     RETURNING *`,
    [
      nombre,
      normalizedCurp,
      calculatedAge ?? edad ?? null,
      fecha_nacimiento ?? null,
      tipo_sangre ?? null,
      sexo ?? null,
      telefono ?? null,
      email ?? null,
      direccion ?? null,
      contacto_emergencia_nombre ?? null,
      contacto_emergencia_telefono ?? null,
      alergias_resumen ?? null,
      ultima_visita ?? null,
      typeof activo === "boolean" ? activo : null,
      typeof dado_de_baja === "boolean" ? dado_de_baja : null,
      fecha_baja ?? null,
      motivo_baja ?? null,
      fechaMinimaConservacion,
      id,
    ]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "paciente",
    result.rows[0].id,
    {
      nombre: result.rows[0].nombre,
      activo: result.rows[0].activo,
    }
  );

  res.json(result.rows[0]);
}));

app.put("/api/pacientes/:id/rectificar", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    curp,
    fecha_nacimiento,
    sexo,
    tipo_sangre,
    telefono,
    email,
    direccion,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    alergias_resumen,
    descripcion,
  } = req.body;

  const normalizedCurp = normalizeCurp(curp);
  if (normalizedCurp && !isValidCurp(normalizedCurp)) {
    return res.status(400).json({
      error: "validation_error",
      message: "CURP invalida",
    });
  }

  const calculatedAge = calculateAge(fecha_nacimiento);

  const result = await pool.query(
    `UPDATE pacientes
     SET
       nombre = COALESCE($1, nombre),
       curp = COALESCE($2, curp),
       edad = COALESCE($3, edad),
       fecha_nacimiento = COALESCE($4, fecha_nacimiento),
       sexo = COALESCE($5, sexo),
       tipo_sangre = COALESCE($6, tipo_sangre),
       telefono = COALESCE($7, telefono),
       email = COALESCE($8, email),
       direccion = COALESCE($9, direccion),
       contacto_emergencia_nombre = COALESCE($10, contacto_emergencia_nombre),
       contacto_emergencia_telefono = COALESCE($11, contacto_emergencia_telefono),
       alergias_resumen = COALESCE($12, alergias_resumen)
     WHERE id = $13
     RETURNING *`,
    [
      nombre ?? null,
      normalizedCurp || null,
      calculatedAge ?? null,
      fecha_nacimiento ?? null,
      sexo ?? null,
      tipo_sangre ?? null,
      telefono ?? null,
      email ?? null,
      direccion ?? null,
      contacto_emergencia_nombre ?? null,
      contacto_emergencia_telefono ?? null,
      alergias_resumen ?? null,
      id,
    ]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  const solicitudResult = await pool.query(
    `INSERT INTO solicitudes_arco (
      paciente_id, tipo, descripcion, estado, fecha_solicitud, fecha_respuesta
    )
    VALUES ($1, 'Rectificacion', $2, 'Atendida', NOW(), NOW())
    RETURNING *`,
    [id, String(descripcion || "Rectificacion de datos personales").trim()]
  );

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "arco_rectificacion",
    Number(id),
    {
      paciente_id: Number(id),
      solicitud_id: solicitudResult.rows[0].id,
    }
  );

  res.json({
    paciente: result.rows[0],
    solicitud: solicitudResult.rows[0],
  });
}));

app.post("/api/pacientes/:id/cancelacion", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { descripcion } = req.body;

  const patientResult = await pool.query(
    `UPDATE pacientes
     SET
       dado_de_baja = TRUE,
       fecha_baja = COALESCE(fecha_baja, NOW()),
       motivo_baja = COALESCE($1, motivo_baja),
       activo = FALSE
     WHERE id = $2
     RETURNING *`,
    [String(descripcion || "Solicitud ARCO de cancelacion").trim(), id]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  const solicitudResult = await pool.query(
    `INSERT INTO solicitudes_arco (
      paciente_id, tipo, descripcion, estado, fecha_solicitud, fecha_respuesta
    )
    VALUES ($1, 'Cancelacion', $2, 'Recibida', NOW(), NULL)
    RETURNING *`,
    [id, String(descripcion || "Solicitud de cancelacion del tratamiento de datos").trim()]
  );

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "arco_cancelacion",
    Number(id),
    {
      paciente_id: Number(id),
      solicitud_id: solicitudResult.rows[0].id,
    }
  );

  res.json({
    paciente: patientResult.rows[0],
    solicitud: solicitudResult.rows[0],
  });
}));

app.post("/api/pacientes/:id/oposicion", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { descripcion } = req.body;

  const patientResult = await pool.query("SELECT * FROM pacientes WHERE id = $1", [id]);
  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  const solicitudResult = await pool.query(
    `INSERT INTO solicitudes_arco (
      paciente_id, tipo, descripcion, estado, fecha_solicitud, fecha_respuesta
    )
    VALUES ($1, 'Oposicion', $2, 'Recibida', NOW(), NULL)
    RETURNING *`,
    [id, String(descripcion || "Solicitud de oposicion al tratamiento de datos").trim()]
  );

  await writeAuditLog(
    pool,
    req.user,
    "create",
    "arco_oposicion",
    Number(id),
    {
      paciente_id: Number(id),
      solicitud_id: solicitudResult.rows[0].id,
    }
  );

  res.status(201).json({
    paciente: patientResult.rows[0],
    solicitud: solicitudResult.rows[0],
  });
}));

app.delete("/api/pacientes/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { motivo_baja } = req.body || {};
  const now = new Date().toISOString();
  const result = await pool.query(
    `UPDATE pacientes
     SET
       dado_de_baja = TRUE,
       fecha_baja = $1,
       motivo_baja = $2,
       activo = FALSE
     WHERE id = $3
     RETURNING *`,
    [now, String(motivo_baja || "").trim() || null, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "paciente",
    result.rows[0].id,
    {
      nombre: result.rows[0].nombre,
      dado_de_baja: true,
      motivo_baja: result.rows[0].motivo_baja,
    }
  );

  res.json({
    deleted: false,
    patient: result.rows[0],
  });
}));

app.get("/api/consultas", asyncHandler(async (req, res) => {
  const patientId = req.query.paciente_id;
  const params = [];
  let whereClause = "";

  if (patientId) {
    params.push(patientId);
    whereClause = "WHERE c.paciente_id = $1";
  }

  const result = await pool.query(
    `SELECT
       c.*,
       p.nombre AS paciente_nombre,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', r.id,
               'medicamento', r.medicamento,
               'presentacion', r.presentacion,
               'dosis', r.dosis,
               'via_administracion', r.via_administracion,
               'frecuencia_cantidad', r.frecuencia_cantidad,
               'frecuencia_unidad', r.frecuencia_unidad,
               'duracion_cantidad', r.duracion_cantidad,
               'duracion_unidad', r.duracion_unidad,
               'indicaciones', r.indicaciones
             )
           )
           FROM recetas r
           WHERE r.consulta_id = c.id
         ),
         '[]'
       ) AS recetas,
       COALESCE(
         (
           SELECT json_agg(
               json_build_object(
                 'id', e.id,
                 'nombre', e.nombre,
                 'tipo', e.tipo,
                 'estado', e.estado,
                 'resultado', e.resultado,
                 'problema_clinico', e.problema_clinico,
                 'fecha_estudio', e.fecha_estudio,
                 'interpretacion', e.interpretacion,
                 'medico_solicita_nombre', e.medico_solicita_nombre,
                 'medico_solicita_cedula', e.medico_solicita_cedula
               )
             )
           FROM estudios e
           WHERE e.consulta_id = c.id
         ),
         '[]'
       ) AS estudios
     FROM consultas c
     LEFT JOIN pacientes p ON p.id = c.paciente_id
     ${whereClause}
     ORDER BY c.fecha DESC
     LIMIT 100`,
    params
  );

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "consultas",
    patientId ? Number(patientId) : null,
    {
      paciente_id: patientId ? Number(patientId) : null,
      total: result.rowCount,
    }
  );

  res.json(result.rows);
}));

app.get("/api/pacientes/:id/expediente-pdf", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinicConfig = await getClinicConfig(pool);

  const patientResult = await pool.query(
    `SELECT *
     FROM pacientes
     WHERE id = $1`,
    [id]
  );

  if (patientResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Paciente no encontrado",
    });
  }

  const patient = patientResult.rows[0];

  const [antecedentesResult, consultationsResult] = await Promise.all([
    pool.query(
      `SELECT tipo, descripcion, created_at
       FROM antecedentes_medicos
       WHERE paciente_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id]
    ),
    pool.query(
      `SELECT
         c.*,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'medicamento', r.medicamento,
                 'dosis', r.dosis,
                 'presentacion', r.presentacion,
                 'via_administracion', r.via_administracion,
                 'frecuencia_cantidad', r.frecuencia_cantidad,
                 'frecuencia_unidad', r.frecuencia_unidad,
                 'duracion_cantidad', r.duracion_cantidad,
                 'duracion_unidad', r.duracion_unidad
               )
             )
             FROM recetas r
             WHERE r.consulta_id = c.id
           ),
           '[]'
         ) AS recetas,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'nombre', e.nombre,
                 'tipo', e.tipo,
                 'estado', e.estado,
                 'resultado', e.resultado,
                 'problema_clinico', e.problema_clinico,
                 'fecha_estudio', e.fecha_estudio,
                 'interpretacion', e.interpretacion,
                 'medico_solicita_nombre', e.medico_solicita_nombre,
                 'medico_solicita_cedula', e.medico_solicita_cedula
               )
             )
             FROM estudios e
             WHERE e.consulta_id = c.id
           ),
           '[]'
         ) AS estudios
       FROM consultas c
       WHERE c.paciente_id = $1
       ORDER BY c.fecha DESC`,
      [id]
    ),
  ]);

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "expediente_pdf",
    Number(id),
    {
      paciente_id: Number(id),
      external_id: patient.external_id,
    }
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="expediente-${sanitizePdfText(patient.external_id || `paciente-${patient.id}`)}.pdf"`
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.pipe(res);

  const logoBuffer = parseLogoBuffer(clinicConfig.logo_data_url);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 50, 45, { fit: [55, 55], align: "left" });
    } catch {
      // Ignore invalid logo content and continue rendering PDF.
    }
  }

  doc.fontSize(20).text(sanitizePdfText(clinicConfig.nombre_consultorio), {
    align: "left",
    continued: false,
  });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Direccion: ${sanitizePdfText(clinicConfig.direccion)}`);
  doc.text(`Telefono: ${sanitizePdfText(clinicConfig.telefono)}`);
  doc.text(`Email: ${sanitizePdfText(clinicConfig.email_contacto)}`);
  doc.text(`Cedula profesional: ${sanitizePdfText(clinicConfig.cedula_profesional)}`);
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Paciente: ${sanitizePdfText(patient.nombre)}`);
  doc.text(`Expediente: ${sanitizePdfText(patient.external_id || `DB-${patient.id}`)}`);
  doc.text(`Sexo: ${sanitizePdfText(patient.sexo || "Sin registro")}`);
  doc.text(`Edad: ${patient.edad ?? calculateAge(patient.fecha_nacimiento) ?? "Sin registro"}`);
  doc.text(`Telefono: ${sanitizePdfText(patient.telefono || "Sin registro")}`);
  doc.text(`Email: ${sanitizePdfText(patient.email || "Sin registro")}`);
  doc.text(`Direccion: ${sanitizePdfText(patient.direccion || "Sin registro")}`);
  doc.text(`Alergias: ${sanitizePdfText(patient.alergias_resumen || "Sin registro")}`);
  doc.moveDown();

  doc.fontSize(14).text("Antecedentes medicos");
  doc.moveDown(0.5);
  if (antecedentesResult.rowCount === 0) {
    doc.fontSize(10).text("Sin antecedentes registrados.");
  } else {
    antecedentesResult.rows.forEach((item) => {
      doc
        .fontSize(10)
        .text(`- ${sanitizePdfText(item.tipo)}: ${sanitizePdfText(item.descripcion)}`);
    });
  }

  doc.moveDown();
  doc.fontSize(14).text("Consultas");
  doc.moveDown(0.5);

  if (consultationsResult.rowCount === 0) {
    doc.fontSize(10).text("Sin consultas registradas.");
  } else {
    consultationsResult.rows.forEach((consulta, index) => {
      if (index > 0) {
        doc.moveDown();
      }

      doc.fontSize(11).text(`Fecha: ${sanitizePdfText(new Date(consulta.fecha).toLocaleString("es-MX"))}`);
      const consultationSnapshotName = consulta.paciente_nombre_snapshot || patient.nombre || "Sin registro";
      const consultationSnapshotAge =
        consulta.paciente_edad_snapshot ?? patient.edad ?? calculateAge(patient.fecha_nacimiento) ?? "Sin registro";
      const consultationSnapshotSex = consulta.paciente_sexo_snapshot || patient.sexo || "Sin registro";

      doc.text(`Paciente: ${sanitizePdfText(consultationSnapshotName)}`);
      doc.text(`Edad: ${sanitizePdfText(String(consultationSnapshotAge))}`);
      doc.text(`Sexo: ${sanitizePdfText(consultationSnapshotSex)}`);
      doc.text(`Motivo: ${sanitizePdfText(consulta.motivo || "Sin registro")}`);
      doc.text(
        `Diagnostico: ${sanitizePdfText(
          consulta.cie10_codigo
            ? `${consulta.cie10_codigo} - ${consulta.cie10_descripcion || consulta.diagnostico || ""}`
            : consulta.diagnostico || "Sin registro"
        )}`
      );
      doc.text(`Pronostico: ${sanitizePdfText(consulta.pronostico || "Sin registro")}`);
      doc.text(`Plan: ${sanitizePdfText(consulta.plan_tratamiento || "Sin registro")}`);
      doc.text(`Medico: ${sanitizePdfText(consulta.medico_nombre || "Sin registro")}`);
      doc.text(`Cedula: ${sanitizePdfText(consulta.medico_cedula || "Sin registro")}`);
      doc.text(
        `Firma digital: Firmado digitalmente por Dr. ${sanitizePdfText(consulta.medico_nombre || "Sin medico")}, Cedula ${sanitizePdfText(
          consulta.medico_cedula || "Sin registro"
        )} el ${sanitizePdfText(new Date(consulta.firma_timestamp || consulta.updated_at || consulta.fecha).toLocaleString("es-MX"))}`
      );
      if (consulta.firma_hash) {
        doc.fontSize(8).fillColor("#475569").text(`SHA-256: ${sanitizePdfText(consulta.firma_hash)}`);
        doc.fontSize(10).fillColor("#111827");
      }
      doc.text(`Padecimiento actual: ${sanitizePdfText(consulta.padecimiento_actual || "Sin registro")}`);
      doc.text(`Interrogatorio por aparatos y sistemas: ${sanitizePdfText(consulta.interrogatorio_aparatos_sistemas || "Sin registro")}`);
      doc.text(`Exploracion fisica: ${sanitizePdfText(buildExplorationText(consulta) || "Sin registro")}`);

      const recetas = Array.isArray(consulta.recetas) ? consulta.recetas : [];
      const estudios = Array.isArray(consulta.estudios) ? consulta.estudios : [];

      if (recetas.length) {
        doc.text("Receta:");
        recetas.forEach((receta) => {
      doc.text(
        `  - ${sanitizePdfText(receta.medicamento)} ${sanitizePdfText(receta.dosis || "")} ${sanitizePdfText(receta.presentacion || "")} | Via: ${sanitizePdfText(receta.via_administracion || "Sin via especificada")}`
      );
        });
      }

      if (estudios.length) {
        doc.text("Estudios:");
        estudios.forEach((estudio) => {
          doc.text(`  - ${sanitizePdfText(estudio.nombre)} (${sanitizePdfText(estudio.tipo || "Sin tipo")})`);
          doc.text(`    Estado: ${sanitizePdfText(estudio.estado || "Solicitado")}`);
          doc.text(`    Problema clinico: ${sanitizePdfText(estudio.problema_clinico || "Sin registro")}`);
          doc.text(
            `    Fecha del estudio: ${sanitizePdfText(
              estudio.fecha_estudio ? new Date(estudio.fecha_estudio).toLocaleString("es-MX") : "Sin registro"
            )}`
          );
          doc.text(`    Resultado: ${sanitizePdfText(estudio.resultado || "Sin resultado")}`);
          doc.text(`    Interpretacion: ${sanitizePdfText(estudio.interpretacion || "Sin interpretacion")}`);
          doc.text(
            `    Medico solicita: ${sanitizePdfText(estudio.medico_solicita_nombre || "Sin registro")} | Cedula: ${sanitizePdfText(
              estudio.medico_solicita_cedula || "Sin registro"
            )}`
          );
        });
      }
    });
  }

  doc.end();
}));

app.get("/api/consultas/:id/receta-pdf", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinicConfig = await getClinicConfig(pool);

  const consultationResult = await pool.query(
    `SELECT
       c.*,
       p.id AS paciente_id,
       p.nombre AS paciente_nombre,
       p.edad AS paciente_edad,
       p.fecha_nacimiento,
       p.external_id,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', r.id,
               'medicamento', r.medicamento,
               'presentacion', r.presentacion,
               'dosis', r.dosis,
               'via_administracion', r.via_administracion,
               'frecuencia_cantidad', r.frecuencia_cantidad,
               'frecuencia_unidad', r.frecuencia_unidad,
               'duracion_cantidad', r.duracion_cantidad,
               'duracion_unidad', r.duracion_unidad,
               'indicaciones', r.indicaciones
             )
           )
           FROM recetas r
           WHERE r.consulta_id = c.id
         ),
         '[]'
       ) AS recetas
     FROM consultas c
     INNER JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.id = $1`,
    [id]
  );

  if (consultationResult.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Consulta no encontrada",
    });
  }

  const consultation = consultationResult.rows[0];
  const patientName = consultation.paciente_nombre_snapshot || consultation.paciente_nombre || "Sin paciente";
  const patientAge =
    consultation.paciente_edad_snapshot ??
    consultation.paciente_edad ??
    calculateAge(consultation.fecha_nacimiento) ??
    "Sin registro";
  const patientSex = consultation.paciente_sexo_snapshot || "Sin registro";
  const recetas = Array.isArray(consultation.recetas) ? consultation.recetas : [];
  const diagnosis = consultation.cie10_codigo
    ? `${consultation.cie10_codigo} - ${consultation.cie10_descripcion || consultation.diagnostico || "Sin diagnostico"}`
    : consultation.diagnostico || "Sin diagnostico";
  const folio = `REC-${consultation.external_id || consultation.paciente_id}-${consultation.id}`;

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "receta_pdf",
    Number(id),
    {
      consulta_id: Number(id),
      paciente_id: consultation.paciente_id,
      external_id: consultation.external_id,
    }
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receta-${sanitizePdfText(folio)}.pdf"`
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.pipe(res);

  const logoBuffer = parseLogoBuffer(clinicConfig.logo_data_url);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 50, 45, { fit: [55, 55], align: "left" });
    } catch {
      // Ignore invalid logo content and continue rendering PDF.
    }
  }

  doc.fontSize(20).fillColor("#0f766e").text(sanitizePdfText(clinicConfig.nombre_consultorio), {
    align: "left",
  });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor("#475569")
    .text(`Direccion: ${sanitizePdfText(clinicConfig.direccion)}`);
  doc.text(`Telefono: ${sanitizePdfText(clinicConfig.telefono)}`);
  doc.text(`Email: ${sanitizePdfText(clinicConfig.email_contacto)}`);
  doc.text(
    `Medico: ${sanitizePdfText(consultation.medico_nombre || "Sin medico")} | Cedula: ${sanitizePdfText(
      consultation.medico_cedula || clinicConfig.cedula_profesional
    )}`
  );

  doc.moveDown();
  doc.fontSize(12).fillColor("#0f172a").text("Datos del paciente");
  doc.moveDown(0.3);
  doc.fontSize(10);
  doc.text(`Nombre: ${sanitizePdfText(patientName)}`);
  doc.text(`Edad: ${sanitizePdfText(String(patientAge))}`);
  doc.text(`Sexo: ${sanitizePdfText(patientSex)}`);
  doc.text(`Fecha: ${sanitizePdfText(new Date(consultation.fecha).toLocaleString("es-MX"))}`);

  doc.moveDown();
  doc.fontSize(12).text("Diagnostico CIE-10");
  doc.moveDown(0.3);
  doc.fontSize(10).text(sanitizePdfText(diagnosis));

  doc.moveDown();
  doc.fontSize(12).text("Pronostico");
  doc.moveDown(0.3);
  doc.fontSize(10).text(sanitizePdfText(consultation.pronostico || "Sin pronostico registrado"));

  doc.moveDown();
  doc.fontSize(12).text("Medicamentos");
  doc.moveDown(0.5);

  if (recetas.length === 0) {
    doc.fontSize(10).text("Sin medicamentos registrados.");
  } else {
    recetas.forEach((receta, index) => {
      const frecuencia = receta.frecuencia_cantidad
        ? `Cada ${receta.frecuencia_cantidad} ${sanitizePdfText(receta.frecuencia_unidad || "").toLowerCase()}`
        : "Sin pauta";
      const duracion = receta.duracion_cantidad
        ? `${receta.duracion_cantidad} ${sanitizePdfText(receta.duracion_unidad || "").toLowerCase()}`
        : "Sin definir";

      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${sanitizePdfText(receta.medicamento)} ${sanitizePdfText(
            receta.dosis || ""
          )} ${sanitizePdfText(receta.presentacion || "")}`
        );
      doc.fontSize(9).fillColor("#475569").text(`   Frecuencia: ${frecuencia}`);
      doc.fontSize(9).text(`   Duracion: ${duracion}`);
      doc.fillColor("#0f172a");
      if (receta.indicaciones) {
        doc.fontSize(9).text(`   Indicaciones: ${sanitizePdfText(receta.indicaciones)}`);
      }
      doc.moveDown(0.4);
    });
  }

  doc.moveDown(1.5);
  doc.fontSize(10).text("Firma del medico", 50, doc.y, { width: 240, align: "center" });
  doc.moveTo(50, doc.y + 18).lineTo(290, doc.y + 18).strokeColor("#94a3b8").stroke();

  doc.moveDown(3);
  doc.fontSize(9).fillColor("#64748b");
  doc.text(`Emitida: ${sanitizePdfText(new Date().toLocaleString("es-MX"))}`, 50, doc.y, {
    align: "left",
  });
  doc.text(`Folio: ${sanitizePdfText(folio)}`, 0, doc.y - 11, { align: "right" });

  doc.end();
}));

app.post("/api/consultas", asyncHandler(async (req, res) => {
  const {
    paciente_id,
    cita_id,
    fecha,
    motivo,
    padecimiento_actual,
    interrogatorio_aparatos_sistemas,
    descripcion_fisica,
    habitus_exterior,
    exploracion_cabeza,
    exploracion_cuello,
    exploracion_torax,
    exploracion_abdomen,
    exploracion_extremidades,
    exploracion_genitales,
    diagnostico,
    cie10_codigo,
    cie10_descripcion,
    pronostico,
    plan_tratamiento,
    signos,
    notas,
    medicamentos = [],
    estudios = [],
    consentimiento_clinico,
  } = req.body;

  const consentText = String(consentimiento_clinico?.texto || "").trim();
  const placeOfIssue = String(consentimiento_clinico?.lugar_emision || "").trim();
  const medicalAct = String(consentimiento_clinico?.acto_medico || "").trim();
  const expectedBenefits = String(consentimiento_clinico?.beneficios_esperados || "").trim();
  const patientNameForConsent = String(consentimiento_clinico?.paciente_nombre || "").trim();
  const patientSignature = String(consentimiento_clinico?.paciente_firma || "").trim();
  const doctorNameForConsent = String(consentimiento_clinico?.medico_nombre || req.user?.nombre || "").trim();
  const doctorLicenseForConsent = String(
    consentimiento_clinico?.medico_cedula || req.user?.cedula_profesional || ""
  ).trim();
  const doctorSignature = String(consentimiento_clinico?.medico_firma || "").trim();
  const generalRisks = String(consentimiento_clinico?.riesgos_generales || "").trim();

  if (
    !consentimiento_clinico?.aceptado ||
    !consentText ||
    !placeOfIssue ||
    !medicalAct ||
    !expectedBenefits ||
    !consentimiento_clinico?.autorizacion_contingencias ||
    !patientNameForConsent ||
    !patientSignature ||
    !doctorNameForConsent ||
    !doctorLicenseForConsent ||
    !doctorSignature
  ) {
    return res.status(400).json({
      error: "validation_error",
      message: "Debes completar el consentimiento informado clinico antes de guardar la consulta",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const patientLookup = await client.query(
      `SELECT nombre, sexo, edad, fecha_nacimiento, external_id
       FROM pacientes
       WHERE id = $1`,
      [paciente_id]
    );
    const patient = patientLookup.rows[0] || null;
    const patientAgeSnapshot = patient?.edad ?? calculateAge(patient?.fecha_nacimiento) ?? null;
    const signatureTimestamp = new Date().toISOString();
    const physicalDescription = descripcion_fisica || habitus_exterior || null;
    const signatureHash = generateConsultationSignature({
      paciente_id,
      fecha,
      motivo,
      padecimiento_actual,
      interrogatorio_aparatos_sistemas: interrogatorio_aparatos_sistemas || null,
      descripcion_fisica: physicalDescription,
      diagnostico,
      cie10_codigo: cie10_codigo ?? null,
      cie10_descripcion: cie10_descripcion ?? null,
      pronostico: pronostico || null,
      plan_tratamiento,
      signos,
      notas: notas ?? null,
      medico_id: req.user.id,
      timestamp: signatureTimestamp,
    });

    const consultationResult = await client.query(
      `INSERT INTO consultas (
        paciente_id, cita_id, fecha, motivo, padecimiento_actual, interrogatorio_aparatos_sistemas,
        paciente_nombre_snapshot, paciente_edad_snapshot, paciente_sexo_snapshot, descripcion_fisica,
        habitus_exterior, exploracion_cabeza, exploracion_cuello, exploracion_torax, exploracion_abdomen,
        exploracion_extremidades, exploracion_genitales, diagnostico, cie10_codigo, cie10_descripcion, pronostico,
        plan_tratamiento, signos, notas, firma_hash, firma_timestamp, medico_user_id, medico_nombre, medico_cedula
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING *`,
      [
        paciente_id,
        cita_id ?? null,
        fecha,
        motivo,
        padecimiento_actual,
        interrogatorio_aparatos_sistemas || null,
        patient?.nombre || null,
        patientAgeSnapshot,
        patient?.sexo || null,
        physicalDescription,
        habitus_exterior || descripcion_fisica || null,
        exploracion_cabeza || null,
        exploracion_cuello || null,
        exploracion_torax || null,
        exploracion_abdomen || null,
        exploracion_extremidades || null,
        exploracion_genitales || null,
        diagnostico,
        cie10_codigo ?? null,
        cie10_descripcion ?? null,
        pronostico || null,
        plan_tratamiento,
        signos,
        notas ?? null,
        signatureHash,
        signatureTimestamp,
        req.user.id,
        req.user.nombre,
        req.user.cedula_profesional ?? null,
      ]
    );

    const consultation = consultationResult.rows[0];

    await client.query(
      `INSERT INTO consentimientos_clinicos (
        paciente_id, consulta_id, medico_id, texto, lugar_emision, acto_medico, riesgos_generales,
        beneficios_esperados, autorizacion_contingencias, paciente_nombre, paciente_firma,
        testigo_uno_nombre, testigo_uno_firma, testigo_dos_nombre, testigo_dos_firma,
        medico_nombre, medico_cedula, medico_firma, fecha, aceptado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        paciente_id,
        consultation.id,
        req.user.id,
        consentText,
        placeOfIssue,
        medicalAct,
        generalRisks || null,
        expectedBenefits,
        true,
        patientNameForConsent,
        patientSignature,
        null,
        null,
        null,
        null,
        doctorNameForConsent,
        doctorLicenseForConsent,
        doctorSignature,
        consentimiento_clinico.fecha ?? fecha,
        true,
      ]
    );

    for (const med of medicamentos) {
      await client.query(
        `INSERT INTO recetas (
          consulta_id, medicamento, presentacion, dosis, via_administracion,
          frecuencia_cantidad, frecuencia_unidad, duracion_cantidad,
          duracion_unidad, indicaciones
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          consultation.id,
          med.nombre,
          med.presentacion || null,
          med.dosis || null,
          med.viaAdministracion || "Oral",
          med.cadaCantidad ? Number(med.cadaCantidad) : null,
          med.cadaUnidad || null,
          med.duranteCantidad ? Number(med.duranteCantidad) : null,
          med.duranteUnidad || null,
          null,
        ]
      );
    }

    for (const estudio of estudios) {
      if (!String(estudio?.nombre || "").trim()) continue;

      await client.query(
        `INSERT INTO estudios (
          consulta_id, nombre, tipo, estado, problema_clinico, fecha_estudio,
          resultado, interpretacion, medico_solicita_nombre, medico_solicita_cedula
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          consultation.id,
          String(estudio.nombre).trim(),
          estudio.tipo ? String(estudio.tipo).trim() : null,
          estudio.estado ? String(estudio.estado).trim() : "Solicitado",
          estudio.problemaClinico ? String(estudio.problemaClinico).trim() : null,
          estudio.fechaEstudio ? new Date(estudio.fechaEstudio).toISOString() : null,
          estudio.resultado ? String(estudio.resultado).trim() : null,
          estudio.interpretacion ? String(estudio.interpretacion).trim() : null,
          estudio.medicoSolicitaNombre
            ? String(estudio.medicoSolicitaNombre).trim()
            : req.user.nombre,
          estudio.medicoSolicitaCedula
            ? String(estudio.medicoSolicitaCedula).trim()
            : req.user.cedula_profesional ?? null,
        ]
      );
    }

    await client.query(
      `UPDATE pacientes
       SET
         ultima_visita = $1,
         fecha_minima_conservacion = $2
       WHERE id = $3`,
      [fecha, calculateMinimumRetentionDate(fecha), paciente_id]
    );

    if (cita_id) {
      await client.query(
        `UPDATE citas
         SET estado = 'Completado'
         WHERE id = $1`,
        [cita_id]
      );
    }

    await writeAuditLog(
      client,
      req.user,
      "create",
      "consulta",
      consultation.id,
      {
        paciente_id: Number(paciente_id),
        paciente_nombre: patient?.nombre || null,
        external_id: patient?.external_id || null,
        cita_id: cita_id ? Number(cita_id) : null,
        medico_nombre: req.user.nombre,
        diagnostico:
          cie10_codigo && cie10_descripcion
            ? `${cie10_codigo} - ${cie10_descripcion}`
            : cie10_codigo || diagnostico || null,
        consentimiento_clinico: true,
      }
    );

    await client.query("COMMIT");
    res.status(201).json(consultation);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.put("/api/consultas/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    paciente_id,
    fecha,
    motivo,
    padecimiento_actual,
    interrogatorio_aparatos_sistemas,
    descripcion_fisica,
    habitus_exterior,
    exploracion_cabeza,
    exploracion_cuello,
    exploracion_torax,
    exploracion_abdomen,
    exploracion_extremidades,
    exploracion_genitales,
    diagnostico,
    cie10_codigo,
    cie10_descripcion,
    pronostico,
    plan_tratamiento,
    signos,
    notas,
    medicamentos = [],
    estudios = [],
    consentimiento_clinico,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const patientLookup = await client.query(
      `SELECT nombre, external_id
       FROM pacientes
       WHERE id = $1`,
      [paciente_id]
    );
    const patient = patientLookup.rows[0] || null;
    const signatureTimestamp = new Date().toISOString();
    const physicalDescription = descripcion_fisica || habitus_exterior || null;
    const signatureHash = generateConsultationSignature({
      paciente_id,
      fecha,
      motivo,
      padecimiento_actual,
      interrogatorio_aparatos_sistemas: interrogatorio_aparatos_sistemas || null,
      descripcion_fisica: physicalDescription,
      diagnostico,
      cie10_codigo: cie10_codigo ?? null,
      cie10_descripcion: cie10_descripcion ?? null,
      pronostico: pronostico || null,
      plan_tratamiento,
      signos,
      notas: notas ?? null,
      medico_id: req.user.id,
      timestamp: signatureTimestamp,
    });

    const consultationResult = await client.query(
      `UPDATE consultas
       SET
         paciente_id = $1,
         fecha = $2,
         motivo = $3,
         padecimiento_actual = $4,
         interrogatorio_aparatos_sistemas = $5,
         descripcion_fisica = $6,
         habitus_exterior = $7,
         exploracion_cabeza = $8,
         exploracion_cuello = $9,
         exploracion_torax = $10,
         exploracion_abdomen = $11,
         exploracion_extremidades = $12,
         exploracion_genitales = $13,
         diagnostico = $14,
         cie10_codigo = $15,
         cie10_descripcion = $16,
         pronostico = $17,
         plan_tratamiento = $18,
         signos = $19,
         notas = $20,
         firma_hash = $21,
         firma_timestamp = $22
       WHERE id = $23
       RETURNING *`,
      [
        paciente_id,
        fecha,
        motivo,
        padecimiento_actual,
        interrogatorio_aparatos_sistemas || null,
        physicalDescription,
        habitus_exterior || descripcion_fisica || null,
        exploracion_cabeza || null,
        exploracion_cuello || null,
        exploracion_torax || null,
        exploracion_abdomen || null,
        exploracion_extremidades || null,
        exploracion_genitales || null,
        diagnostico,
        cie10_codigo ?? null,
        cie10_descripcion ?? null,
        pronostico || null,
        plan_tratamiento,
        signos,
        notas ?? null,
        signatureHash,
        signatureTimestamp,
        id,
      ]
    );

    if (consultationResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "not_found",
        message: "Consulta no encontrada",
      });
    }

    const consultation = consultationResult.rows[0];

    await client.query("DELETE FROM recetas WHERE consulta_id = $1", [id]);
    await client.query("DELETE FROM estudios WHERE consulta_id = $1", [id]);

    for (const med of medicamentos) {
      await client.query(
        `INSERT INTO recetas (
          consulta_id, medicamento, presentacion, dosis, via_administracion,
          frecuencia_cantidad, frecuencia_unidad, duracion_cantidad,
          duracion_unidad, indicaciones
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          consultation.id,
          med.nombre,
          med.presentacion || null,
          med.dosis || null,
          med.viaAdministracion || "Oral",
          med.cadaCantidad ? Number(med.cadaCantidad) : null,
          med.cadaUnidad || null,
          med.duranteCantidad ? Number(med.duranteCantidad) : null,
          med.duranteUnidad || null,
          null,
        ]
      );
    }

    for (const estudio of estudios) {
      if (!String(estudio?.nombre || "").trim()) continue;

      await client.query(
        `INSERT INTO estudios (
          consulta_id, nombre, tipo, estado, problema_clinico, fecha_estudio,
          resultado, interpretacion, medico_solicita_nombre, medico_solicita_cedula
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          consultation.id,
          String(estudio.nombre).trim(),
          estudio.tipo ? String(estudio.tipo).trim() : null,
          estudio.estado ? String(estudio.estado).trim() : "Solicitado",
          estudio.problemaClinico ? String(estudio.problemaClinico).trim() : null,
          estudio.fechaEstudio ? new Date(estudio.fechaEstudio).toISOString() : null,
          estudio.resultado ? String(estudio.resultado).trim() : null,
          estudio.interpretacion ? String(estudio.interpretacion).trim() : null,
          estudio.medicoSolicitaNombre
            ? String(estudio.medicoSolicitaNombre).trim()
            : req.user.nombre,
          estudio.medicoSolicitaCedula
            ? String(estudio.medicoSolicitaCedula).trim()
            : req.user.cedula_profesional ?? null,
        ]
      );
    }

    if (consentimiento_clinico?.aceptado) {
      const consentText = String(consentimiento_clinico?.texto || "").trim();
      const placeOfIssue = String(consentimiento_clinico?.lugar_emision || "").trim();
      const medicalAct = String(consentimiento_clinico?.acto_medico || "").trim();
      const expectedBenefits = String(consentimiento_clinico?.beneficios_esperados || "").trim();
      const patientNameForConsent = String(consentimiento_clinico?.paciente_nombre || "").trim();
      const patientSignature = String(consentimiento_clinico?.paciente_firma || "").trim();
      const doctorNameForConsent = String(consentimiento_clinico?.medico_nombre || req.user?.nombre || "").trim();
      const doctorLicenseForConsent = String(
        consentimiento_clinico?.medico_cedula || req.user?.cedula_profesional || ""
      ).trim();
      const doctorSignature = String(consentimiento_clinico?.medico_firma || "").trim();
      const generalRisks = String(consentimiento_clinico?.riesgos_generales || "").trim();

      if (
        consentText &&
        placeOfIssue &&
        medicalAct &&
        expectedBenefits &&
        consentimiento_clinico?.autorizacion_contingencias &&
        patientNameForConsent &&
        patientSignature &&
        doctorNameForConsent &&
        doctorLicenseForConsent &&
        doctorSignature
      ) {
        await client.query("DELETE FROM consentimientos_clinicos WHERE consulta_id = $1", [id]);

        await client.query(
          `INSERT INTO consentimientos_clinicos (
            paciente_id, consulta_id, medico_id, texto, lugar_emision, acto_medico, riesgos_generales,
            beneficios_esperados, autorizacion_contingencias, paciente_nombre, paciente_firma,
            testigo_uno_nombre, testigo_uno_firma, testigo_dos_nombre, testigo_dos_firma,
            medico_nombre, medico_cedula, medico_firma, fecha, aceptado
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            paciente_id,
            consultation.id,
            req.user.id,
            consentText,
            placeOfIssue,
            medicalAct,
            generalRisks || null,
            expectedBenefits,
            true,
            patientNameForConsent,
            patientSignature,
            null,
            null,
            null,
            null,
            doctorNameForConsent,
            doctorLicenseForConsent,
            doctorSignature,
            consentimiento_clinico.fecha ?? fecha,
            true,
          ]
        );
      }
    }

    await writeAuditLog(
      client,
      req.user,
      "update",
      "consulta",
      consultation.id,
      {
        paciente_id: Number(paciente_id),
        paciente_nombre: patient?.nombre || null,
        external_id: patient?.external_id || null,
        medico_nombre: req.user.nombre,
        diagnostico:
          cie10_codigo && cie10_descripcion
            ? `${cie10_codigo} - ${cie10_descripcion}`
            : cie10_codigo || diagnostico || null,
      }
    );

    await client.query("COMMIT");
    res.json(consultation);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.put("/api/estudios/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estado, resultado, interpretacion, fecha_estudio, problema_clinico } = req.body;
  const normalizedEstado = String(estado || "").trim();

  if (![
    "Solicitado",
    "Entregado por el paciente",
    "Revisado por el medico",
  ].includes(normalizedEstado)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Estado de estudio no valido",
    });
  }

  const result = await pool.query(
    `UPDATE estudios e
     SET
       estado = $1,
       problema_clinico = COALESCE(NULLIF($4, ''), problema_clinico),
       fecha_estudio = CASE
         WHEN NULLIF($5, '') IS NOT NULL THEN $5::timestamptz
         ELSE fecha_estudio
       END,
       resultado = CASE
         WHEN $1 = 'Revisado por el medico' THEN NULLIF($2, '')
         ELSE resultado
       END,
       interpretacion = CASE
         WHEN $1 = 'Revisado por el medico' THEN NULLIF($3, '')
         ELSE interpretacion
       END
     FROM consultas c, pacientes p
     WHERE e.id = $6
       AND c.id = e.consulta_id
       AND p.id = c.paciente_id
     RETURNING
       e.id,
       e.consulta_id,
       e.nombre,
       e.tipo,
       e.estado,
       e.problema_clinico,
       e.fecha_estudio,
       e.resultado,
       e.interpretacion,
       e.medico_solicita_nombre,
       e.medico_solicita_cedula,
       p.id AS paciente_id,
       p.nombre AS paciente_nombre,
       p.external_id`,
    [
      normalizedEstado,
      String(resultado || "").trim(),
      String(interpretacion || "").trim(),
      String(problema_clinico || "").trim(),
      String(fecha_estudio || "").trim(),
      id,
    ]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Estudio no encontrado",
    });
  }

  const study = result.rows[0];

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "estudio",
    study.id,
    {
      paciente_id: study.paciente_id,
      paciente_nombre: study.paciente_nombre,
      external_id: study.external_id,
      estudio: study.nombre,
      estado: study.estado,
      interpretacion: study.interpretacion || null,
    }
  );

  res.json(study);
}));

app.get("/api/citas", asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       c.*,
       p.portal_token,
       p.telefono AS paciente_telefono,
       qp.id AS cuestionario_id,
       qp.motivo_consulta AS cuestionario_motivo_consulta,
       qp.sintomas_actuales AS cuestionario_sintomas_actuales,
       qp.medicamentos_actuales AS cuestionario_medicamentos_actuales,
       qp.alergias_conocidas AS cuestionario_alergias_conocidas,
       qp.cambios_desde_ultima_visita AS cuestionario_cambios_desde_ultima_visita,
       qp.updated_at AS cuestionario_actualizado_at,
       linked.id AS consulta_id,
       linked.fecha AS consulta_fecha,
       linked.diagnostico AS consulta_diagnostico,
       linked.cie10_codigo AS consulta_cie10_codigo,
       linked.cie10_descripcion AS consulta_cie10_descripcion
     FROM citas c
     LEFT JOIN pacientes p ON p.id = c.paciente_id
     LEFT JOIN cuestionarios_previos qp ON qp.cita_id = c.id
     LEFT JOIN LATERAL (
       SELECT
         id,
         fecha,
         diagnostico,
         cie10_codigo,
         cie10_descripcion
       FROM consultas
       WHERE cita_id = c.id
       ORDER BY fecha DESC, id DESC
       LIMIT 1
     ) linked ON TRUE
     ORDER BY c.start ASC
     LIMIT 200`
  );

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "citas",
    null,
    { total: result.rowCount }
  );

  res.json(result.rows);
}));

app.post("/api/citas/:id/review-questionnaire", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT
       c.id,
       c.paciente_id,
       c.paciente_nombre,
       c.start,
       qp.id AS cuestionario_id,
       qp.updated_at AS cuestionario_actualizado_at
     FROM citas c
     INNER JOIN cuestionarios_previos qp ON qp.cita_id = c.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Cuestionario no encontrado para esta cita",
    });
  }

  const appointment = result.rows[0];

  await writeAuditLog(
    pool,
    req.user,
    "read",
    "cuestionario_previo",
    appointment.cuestionario_id,
    {
      cita_id: appointment.id,
      paciente_id: appointment.paciente_id,
      paciente_nombre: appointment.paciente_nombre,
      start: appointment.start,
      cuestionario_actualizado_at: appointment.cuestionario_actualizado_at,
    }
  );

  res.json({ ok: true, cuestionario_id: appointment.cuestionario_id });
}));

app.get("/api/audit-log", requireDoctorAccess, asyncHandler(async (req, res) => {
  const { from, to, accion, entidad, limit } = req.query;
  const conditions = [];
  const params = [];

  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }

  if (accion) {
    params.push(accion);
    conditions.push(`accion = $${params.length}`);
  }

  if (entidad) {
    params.push(entidad);
    conditions.push(`entidad = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));

  const result = await pool.query(
    `SELECT
       id,
       usuario_id,
       usuario_nombre,
       accion,
       entidad,
       entidad_id,
       detalle,
       created_at
     FROM audit_log
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    params
  );

  res.json(result.rows);
}));

app.post("/api/citas", asyncHandler(async (req, res) => {
  const { paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion } = req.body;
  const result = await pool.query(
    `INSERT INTO citas (paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion]
  );

  await writeAuditLog(
    pool,
    req.user,
    "create",
    "cita",
    result.rows[0].id,
    {
      paciente_id: result.rows[0].paciente_id,
      paciente_nombre: result.rows[0].paciente_nombre,
      motivo: result.rows[0].motivo || null,
      estado: result.rows[0].estado,
    }
  );

  res.status(201).json(result.rows[0]);
}));

app.put("/api/citas/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion, notas } = req.body;

  const result = await pool.query(
    `UPDATE citas
     SET
       paciente_id = $1,
       paciente_nombre = $2,
       motivo = $3,
       tipo = $4,
       estado = $5,
       start = $6,
       duracion = $7,
       notas = $8
     WHERE id = $9
     RETURNING *`,
    [paciente_id, paciente_nombre, motivo, tipo, estado, start, duracion, notas ?? null, id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: "not_found",
      message: "Cita no encontrada",
    });
  }

  await writeAuditLog(
    pool,
    req.user,
    "update",
    "cita",
    result.rows[0].id,
    {
      paciente_id: result.rows[0].paciente_id,
      paciente_nombre: result.rows[0].paciente_nombre,
      motivo: result.rows[0].motivo || null,
      estado: result.rows[0].estado,
    }
  );

  res.json(result.rows[0]);
}));

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, { index: false }));

  app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
    if (path.extname(req.path)) {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "internal_error",
    message: err.message || "Unexpected server error",
  });
});

(async () => {
  await ensureSchema();
  app.listen(port, host, () => {
    console.log(`API listening on http://${host}:${port}`);
  });
})();
