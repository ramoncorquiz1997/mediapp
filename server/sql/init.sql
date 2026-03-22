CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  medico_user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  external_id TEXT UNIQUE,
  portal_token UUID NOT NULL DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  curp TEXT,
  edad INTEGER,
  fecha_nacimiento DATE,
  tipo_sangre TEXT,
  sexo TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  alergias_resumen TEXT,
  consentimiento_datos_personales BOOLEAN NOT NULL DEFAULT FALSE,
  consentimiento_at TIMESTAMPTZ,
  aviso_privacidad_version TEXT,
  aviso_privacidad_aceptado_at TIMESTAMPTZ,
  dado_de_baja BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_baja TIMESTAMPTZ,
  motivo_baja TEXT,
  fecha_minima_conservacion TIMESTAMPTZ,
  notas TEXT,
  ultima_visita TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS medico_user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS consentimiento_datos_personales BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS consentimiento_at TIMESTAMPTZ;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS aviso_privacidad_version TEXT;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS aviso_privacidad_aceptado_at TIMESTAMPTZ;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS dado_de_baja BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMPTZ;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS motivo_baja TEXT;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS fecha_minima_conservacion TIMESTAMPTZ;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS curp TEXT;

ALTER TABLE pacientes
ADD COLUMN IF NOT EXISTS portal_token UUID;

UPDATE pacientes
SET portal_token = gen_random_uuid()
WHERE portal_token IS NULL;

ALTER TABLE pacientes
ALTER COLUMN portal_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_portal_token_key
ON pacientes (portal_token);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'medico',
  cedula_profesional TEXT,
  telefono TEXT,
  ciudad_estado TEXT,
  onboarding_clinic_name TEXT,
  onboarding_notes TEXT,
  verification_requested_at TIMESTAMPTZ,
  foto_data_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'approved',
  verification_notes TEXT,
  verification_checked_at TIMESTAMPTZ,
  verification_checked_by_name TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'not_started',
  billing_plan_code TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  billing_amount NUMERIC(10, 2),
  billing_currency TEXT NOT NULL DEFAULT 'MXN',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_current_period_start TIMESTAMPTZ,
  billing_current_period_end TIMESTAMPTZ,
  billing_trial_ends_at TIMESTAMPTZ,
  billing_last_payment_at TIMESTAMPTZ,
  billing_last_payment_status TEXT,
  billing_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  manual_access_until TIMESTAMPTZ,
  manual_billing_override BOOLEAN NOT NULL DEFAULT FALSE,
  manual_override_reason TEXT,
  access_status TEXT NOT NULL DEFAULT 'active',
  saas_notes TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_rol_valido CHECK (rol IN ('admin', 'medico', 'asistente')),
  CONSTRAINT usuarios_verification_status_valido CHECK (
    verification_status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT usuarios_subscription_status_valido CHECK (
    subscription_status IN ('not_started', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
  ),
  CONSTRAINT usuarios_access_status_valido CHECK (
    access_status IN ('pending_onboarding', 'pending_verification', 'pending_payment', 'active', 'limited', 'suspended', 'blocked')
  ),
  CONSTRAINT usuarios_billing_cycle_valido CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'annual', 'custom')),
  CONSTRAINT usuarios_billing_last_payment_status_valido CHECK (
    billing_last_payment_status IS NULL
    OR billing_last_payment_status IN ('paid', 'pending', 'failed', 'refunded', 'waived', 'offline')
  ),
  CONSTRAINT usuarios_billing_currency_valido CHECK (char_length(TRIM(billing_currency)) >= 3)
);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_data_url TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS telefono TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS ciudad_estado TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS onboarding_clinic_name TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS verification_checked_by_name TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'not_started';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_plan_code TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(10, 2);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_currency TEXT NOT NULL DEFAULT 'MXN';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_current_period_start TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_current_period_end TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_trial_ends_at TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_last_payment_at TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_last_payment_status TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS billing_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS manual_access_until TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS manual_billing_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS manual_override_reason TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS access_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS saas_notes TEXT;

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_verification_status_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_verification_status_valido CHECK (
  verification_status IN ('pending', 'approved', 'rejected')
);

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_subscription_status_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_subscription_status_valido CHECK (
  subscription_status IN ('not_started', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
);

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_access_status_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_access_status_valido CHECK (
  access_status IN ('pending_onboarding', 'pending_verification', 'pending_payment', 'active', 'limited', 'suspended', 'blocked')
);

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_billing_cycle_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_billing_cycle_valido CHECK (
  billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'annual', 'custom')
);

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_billing_last_payment_status_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_billing_last_payment_status_valido CHECK (
  billing_last_payment_status IS NULL
  OR billing_last_payment_status IN ('paid', 'pending', 'failed', 'refunded', 'waived', 'offline')
);

ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_billing_currency_valido;

ALTER TABLE usuarios
ADD CONSTRAINT usuarios_billing_currency_valido CHECK (char_length(TRIM(billing_currency)) >= 3);

UPDATE usuarios
SET slug = CONCAT('medico-', id)
WHERE slug IS NULL;

CREATE TABLE IF NOT EXISTS configuracion_consultorio (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nombre_consultorio TEXT NOT NULL DEFAULT 'Consultorio Paupediente',
  direccion TEXT DEFAULT 'Tijuana, Baja California',
  telefono TEXT DEFAULT '664 000 0000',
  email_contacto TEXT DEFAULT 'doctora@Paupediente.mx',
  cedula_profesional TEXT DEFAULT '12345678',
  especialidad TEXT DEFAULT 'Medicina general',
  zona_horaria TEXT NOT NULL DEFAULT 'America/Tijuana',
  horario_laboral JSONB NOT NULL DEFAULT '{
    "0": {"activo": false, "inicio": "09:00", "fin": "17:00"},
    "1": {"activo": true, "inicio": "09:00", "fin": "17:00"},
    "2": {"activo": true, "inicio": "09:00", "fin": "17:00"},
    "3": {"activo": true, "inicio": "09:00", "fin": "17:00"},
    "4": {"activo": true, "inicio": "09:00", "fin": "17:00"},
    "5": {"activo": true, "inicio": "09:00", "fin": "17:00"},
    "6": {"activo": false, "inicio": "09:00", "fin": "14:00"}
  }'::jsonb,
  logo_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion_consultorio
DROP CONSTRAINT IF EXISTS configuracion_consultorio_singleton;

ALTER TABLE configuracion_consultorio
ADD COLUMN IF NOT EXISTS zona_horaria TEXT NOT NULL DEFAULT 'America/Tijuana';

ALTER TABLE configuracion_consultorio
ADD COLUMN IF NOT EXISTS horario_laboral JSONB NOT NULL DEFAULT '{
  "0": {"activo": false, "inicio": "09:00", "fin": "17:00"},
  "1": {"activo": true, "inicio": "09:00", "fin": "17:00"},
  "2": {"activo": true, "inicio": "09:00", "fin": "17:00"},
  "3": {"activo": true, "inicio": "09:00", "fin": "17:00"},
  "4": {"activo": true, "inicio": "09:00", "fin": "17:00"},
  "5": {"activo": true, "inicio": "09:00", "fin": "17:00"},
  "6": {"activo": false, "inicio": "09:00", "fin": "14:00"}
}'::jsonb;

INSERT INTO configuracion_consultorio (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS saas_owner_users (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_configuracion (
  id INTEGER PRIMARY KEY DEFAULT 1,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  leads_notify_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saas_configuracion_singleton CHECK (id = 1)
);

INSERT INTO saas_configuracion (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS antecedentes_medicos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  dado_de_baja BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_baja TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE antecedentes_medicos
ADD COLUMN IF NOT EXISTS dado_de_baja BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE antecedentes_medicos
ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMPTZ;

ALTER TABLE antecedentes_medicos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  medico_user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre TEXT NOT NULL,
  motivo TEXT,
  tipo TEXT,
  estado TEXT NOT NULL DEFAULT 'Confirmado',
  start TIMESTAMPTZ NOT NULL,
  duracion INTEGER NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT citas_duracion_positiva CHECK (duracion > 0),
  CONSTRAINT citas_estado_valido CHECK (estado IN ('Confirmado', 'En espera', 'En consulta', 'Cancelado', 'Completado', 'No asistio'))
);

ALTER TABLE citas
ADD COLUMN IF NOT EXISTS medico_user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;

UPDATE citas c
SET medico_user_id = p.medico_user_id
FROM pacientes p
WHERE c.medico_user_id IS NULL
  AND c.paciente_id = p.id
  AND p.medico_user_id IS NOT NULL;

ALTER TABLE citas
DROP CONSTRAINT IF EXISTS citas_estado_valido;

ALTER TABLE citas
ADD CONSTRAINT citas_estado_valido CHECK (
  estado IN ('Confirmado', 'En espera', 'En consulta', 'Cancelado', 'Completado', 'No asistio')
);

CREATE TABLE IF NOT EXISTS cuestionarios_previos (
  id SERIAL PRIMARY KEY,
  cita_id INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  motivo_consulta TEXT,
  sintomas_actuales TEXT,
  medicamentos_actuales TEXT,
  alergias_conocidas TEXT,
  cambios_desde_ultima_visita TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuestionarios_previos_cita_unica UNIQUE (cita_id)
);

CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  cita_id INTEGER REFERENCES citas(id) ON DELETE SET NULL,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  monto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  metodo_pago TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pagos_estado_valido CHECK (estado IN ('Pendiente', 'Pagado', 'Cancelado'))
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  especialidad TEXT,
  estado TEXT NOT NULL DEFAULT 'nuevo',
  notas TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_billing_events (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'system',
  event_type TEXT NOT NULL,
  event_status TEXT,
  stripe_event_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(10, 2),
  currency TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system';

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS event_type TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS event_status TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS currency TEXT;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE subscription_billing_events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'nuevo';

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS notas TEXT;

CREATE TABLE IF NOT EXISTS consultas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cita_id INTEGER REFERENCES citas(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  padecimiento_actual TEXT,
  interrogatorio_aparatos_sistemas TEXT,
  paciente_nombre_snapshot TEXT,
  paciente_edad_snapshot INTEGER,
  paciente_sexo_snapshot TEXT,
  descripcion_fisica TEXT,
  habitus_exterior TEXT,
  exploracion_cabeza TEXT,
  exploracion_cuello TEXT,
  exploracion_torax TEXT,
  exploracion_abdomen TEXT,
  exploracion_extremidades TEXT,
  exploracion_genitales TEXT,
  diagnostico TEXT,
  pronostico TEXT,
  plan_tratamiento TEXT,
  signos JSONB NOT NULL DEFAULT '{}'::jsonb,
  notas TEXT,
  firma_hash TEXT,
  firma_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS medico_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS medico_nombre TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS medico_cedula TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS cie10_codigo TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS cie10_descripcion TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS pronostico TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS interrogatorio_aparatos_sistemas TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS firma_hash TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS firma_timestamp TIMESTAMPTZ;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS paciente_nombre_snapshot TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS paciente_edad_snapshot INTEGER;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS paciente_sexo_snapshot TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS habitus_exterior TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_cabeza TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_cuello TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_torax TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_abdomen TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_extremidades TEXT;

ALTER TABLE consultas
ADD COLUMN IF NOT EXISTS exploracion_genitales TEXT;

CREATE TABLE IF NOT EXISTS cie10 (
  codigo TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  nivel INTEGER,
  codigo_padre TEXT,
  seleccionable BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cie10
ADD COLUMN IF NOT EXISTS nivel INTEGER;

ALTER TABLE cie10
ADD COLUMN IF NOT EXISTS codigo_padre TEXT;

ALTER TABLE cie10
ADD COLUMN IF NOT EXISTS seleccionable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cie10
ADD COLUMN IF NOT EXISTS source TEXT;

CREATE TABLE IF NOT EXISTS cie10_raw (
  code TEXT PRIMARY KEY,
  code_0 TEXT,
  code_1 TEXT,
  code_2 TEXT,
  code_3 TEXT,
  code_4 TEXT,
  description TEXT NOT NULL,
  level INTEGER,
  source TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recetas (
  id SERIAL PRIMARY KEY,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medicamento TEXT NOT NULL,
  presentacion TEXT,
  dosis TEXT,
  via_administracion TEXT,
  frecuencia_cantidad INTEGER,
  frecuencia_unidad TEXT,
  duracion_cantidad INTEGER,
  duracion_unidad TEXT,
  indicaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recetas
ADD COLUMN IF NOT EXISTS via_administracion TEXT;

CREATE TABLE IF NOT EXISTS estudios (
  id SERIAL PRIMARY KEY,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT,
  estado TEXT NOT NULL DEFAULT 'Solicitado',
  problema_clinico TEXT,
  fecha_estudio TIMESTAMPTZ,
  resultado TEXT,
  interpretacion TEXT,
  medico_solicita_nombre TEXT,
  medico_solicita_cedula TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT estudios_estado_valido CHECK (
    estado IN ('Solicitado', 'Entregado por el paciente', 'Revisado por el medico')
  )
);

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS problema_clinico TEXT;

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS fecha_estudio TIMESTAMPTZ;

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS interpretacion TEXT;

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS medico_solicita_nombre TEXT;

ALTER TABLE estudios
ADD COLUMN IF NOT EXISTS medico_solicita_cedula TEXT;

ALTER TABLE estudios
DROP CONSTRAINT IF EXISTS estudios_estado_valido;

ALTER TABLE estudios
ADD CONSTRAINT estudios_estado_valido CHECK (
  estado IN ('Solicitado', 'Entregado por el paciente', 'Revisado por el medico')
);

CREATE TABLE IF NOT EXISTS consentimientos_clinicos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  lugar_emision TEXT,
  acto_medico TEXT,
  riesgos_generales TEXT,
  beneficios_esperados TEXT,
  autorizacion_contingencias BOOLEAN NOT NULL DEFAULT FALSE,
  paciente_nombre TEXT,
  paciente_firma TEXT,
  testigo_uno_nombre TEXT,
  testigo_uno_firma TEXT,
  testigo_dos_nombre TEXT,
  testigo_dos_firma TEXT,
  medico_nombre TEXT,
  medico_cedula TEXT,
  medico_firma TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aceptado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS lugar_emision TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS acto_medico TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS riesgos_generales TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS beneficios_esperados TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS autorizacion_contingencias BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS paciente_nombre TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS paciente_firma TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS testigo_uno_nombre TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS testigo_uno_firma TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS testigo_dos_nombre TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS testigo_dos_firma TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS medico_nombre TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS medico_cedula TEXT;

ALTER TABLE consentimientos_clinicos
ADD COLUMN IF NOT EXISTS medico_firma TEXT;

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_log_accion_valida CHECK (
    accion IN ('create', 'update', 'delete', 'read', 'login_success', 'login_failed', 'logout')
  )
);

ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_accion_valida;

ALTER TABLE audit_log
ADD CONSTRAINT audit_log_accion_valida CHECK (
  accion IN ('create', 'update', 'delete', 'read', 'login_success', 'login_failed', 'logout')
);

CREATE TABLE IF NOT EXISTS solicitudes_arco (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'Recibida',
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_respuesta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT solicitudes_arco_tipo_valido CHECK (tipo IN ('Acceso', 'Rectificacion', 'Cancelacion', 'Oposicion'))
);

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX IF NOT EXISTS idx_pacientes_external_id ON pacientes(external_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_curp ON pacientes(curp);
CREATE INDEX IF NOT EXISTS idx_pacientes_medico_user_id ON pacientes(medico_user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_slug ON usuarios(slug);
CREATE INDEX IF NOT EXISTS idx_citas_start ON citas(start);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_id ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_medico_user_id ON citas(medico_user_id, start DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_paciente_fecha ON consultas(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_medico_user_id ON consultas(medico_user_id);
CREATE INDEX IF NOT EXISTS idx_consultas_cie10_codigo ON consultas(cie10_codigo);
CREATE INDEX IF NOT EXISTS idx_recetas_consulta_id ON recetas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_estudios_consulta_id ON estudios(consulta_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_consulta_id ON consentimientos_clinicos(consulta_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_events_usuario_id ON subscription_billing_events(usuario_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_events_stripe_event_id ON subscription_billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_arco_paciente_id ON solicitudes_arco(paciente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_arco_tipo ON solicitudes_arco(tipo);
CREATE INDEX IF NOT EXISTS idx_cie10_descripcion ON cie10(descripcion);
CREATE INDEX IF NOT EXISTS idx_cie10_seleccionable ON cie10(seleccionable);
CREATE INDEX IF NOT EXISTS idx_cuestionarios_previos_cita_id ON cuestionarios_previos(cita_id);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente_id ON pagos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cita_id ON pagos(cita_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

DROP TRIGGER IF EXISTS pacientes_set_updated_at ON pacientes;
CREATE TRIGGER pacientes_set_updated_at
BEFORE UPDATE ON pacientes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON usuarios;
CREATE TRIGGER usuarios_set_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS saas_owner_users_set_updated_at ON saas_owner_users;
CREATE TRIGGER saas_owner_users_set_updated_at
BEFORE UPDATE ON saas_owner_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS saas_configuracion_set_updated_at ON saas_configuracion;
CREATE TRIGGER saas_configuracion_set_updated_at
BEFORE UPDATE ON saas_configuracion
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS configuracion_consultorio_set_updated_at ON configuracion_consultorio;
CREATE TRIGGER configuracion_consultorio_set_updated_at
BEFORE UPDATE ON configuracion_consultorio
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS citas_set_updated_at ON citas;
CREATE TRIGGER citas_set_updated_at
BEFORE UPDATE ON citas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS consultas_set_updated_at ON consultas;
CREATE TRIGGER consultas_set_updated_at
BEFORE UPDATE ON consultas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS estudios_set_updated_at ON estudios;
CREATE TRIGGER estudios_set_updated_at
BEFORE UPDATE ON estudios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS antecedentes_medicos_set_updated_at ON antecedentes_medicos;
CREATE TRIGGER antecedentes_medicos_set_updated_at
BEFORE UPDATE ON antecedentes_medicos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS solicitudes_arco_set_updated_at ON solicitudes_arco;
CREATE TRIGGER solicitudes_arco_set_updated_at
BEFORE UPDATE ON solicitudes_arco
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS cuestionarios_previos_set_updated_at ON cuestionarios_previos;
CREATE TRIGGER cuestionarios_previos_set_updated_at
BEFORE UPDATE ON cuestionarios_previos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pagos_set_updated_at ON pagos;
CREATE TRIGGER pagos_set_updated_at
BEFORE UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO usuarios (
  nombre,
  email,
  password_hash,
  rol,
  cedula_profesional
)
VALUES (
  'Dra. Paulina',
  'doctora@Paupediente.mx',
  'scrypt$7505e9071edcc63a7023019a9c94484b$5535ec0ef0acb88383c6fcee649951ff6d86a810443afdad98434245280f67239323c7e4a17aa5afe4ee87af0b38b4b269fbb65f1c3bf8fc2adefc3ade174556',
  'admin',
  '12345678'
)
ON CONFLICT (email) DO NOTHING;

UPDATE usuarios
SET slug = 'dra-paulina'
WHERE email = 'doctora@Paupediente.mx'
  AND slug IS DISTINCT FROM 'dra-paulina'
  AND NOT EXISTS (
    SELECT 1
    FROM usuarios conflict_usuario
    WHERE conflict_usuario.slug = 'dra-paulina'
      AND conflict_usuario.email <> 'doctora@Paupediente.mx'
  );
