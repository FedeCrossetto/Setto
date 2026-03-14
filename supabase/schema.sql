-- ============================================================
--  SETTO — Esquema Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  1. USUARIOS
--     Gestionados por el admin (no usa Supabase Auth)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT    UNIQUE NOT NULL,
  password    TEXT    NOT NULL,
  nombre      TEXT,
  apellido    TEXT,
  edad        INTEGER,
  sexo        TEXT    CHECK (sexo IN ('masculino', 'femenino', 'otro')),
  peso        NUMERIC(5,1),
  altura      NUMERIC(5,1),
  objetivo    TEXT    CHECK (objetivo IN ('perder peso', 'ganar músculo', 'mantener', 'rendimiento')),
  nivel       TEXT    CHECK (nivel IN ('principiante', 'intermedio', 'avanzado')),
  avatar_url  TEXT,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
--  2. RUTINAS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rutinas (
  id          TEXT    PRIMARY KEY,
  usuario_id  UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      TEXT    NOT NULL,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rutinas_usuario ON rutinas(usuario_id);

-- ──────────────────────────────────────────────────────────
--  3. EJERCICIOS DE RUTINA
--     Orden de ejecución dentro de una rutina
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rutina_ejercicios (
  id                TEXT    PRIMARY KEY,   -- formato: "{rutina_id}:{orden}"
  rutina_id         TEXT    NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  orden             INTEGER NOT NULL DEFAULT 0,
  exercise_id       TEXT    NOT NULL,      -- ID local o de ExerciseDB
  nombre            TEXT    NOT NULL,
  gif_url           TEXT,
  musculos_objetivo TEXT[],
  series_default    INTEGER DEFAULT 3
);

CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_rutina ON rutina_ejercicios(rutina_id);

-- ──────────────────────────────────────────────────────────
--  4. SESIONES DE ENTRENAMIENTO
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones (
  id                  TEXT    PRIMARY KEY,
  usuario_id          UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rutina_id           TEXT    REFERENCES rutinas(id) ON DELETE SET NULL,
  nombre_rutina       TEXT    NOT NULL,
  fecha               DATE    NOT NULL,
  inicio              BIGINT,             -- timestamp ms
  fin                 BIGINT,
  duracion_segundos   INTEGER,
  completada          BOOLEAN DEFAULT FALSE,
  creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha   ON sesiones(fecha);

-- ──────────────────────────────────────────────────────────
--  5. EJERCICIOS REALIZADOS EN SESIÓN
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesion_ejercicios (
  id                TEXT    PRIMARY KEY,   -- formato: "{sesion_id}:{orden}"
  sesion_id         TEXT    NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  orden             INTEGER NOT NULL DEFAULT 0,
  exercise_id       TEXT,
  nombre            TEXT    NOT NULL,
  gif_url           TEXT,
  musculos_objetivo TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_sesion_ejercicios_sesion ON sesion_ejercicios(sesion_id);

-- ──────────────────────────────────────────────────────────
--  6. SERIES DE CADA EJERCICIO EN SESIÓN
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesion_series (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_ejercicio_id  TEXT    NOT NULL REFERENCES sesion_ejercicios(id) ON DELETE CASCADE,
  numero_serie         INTEGER NOT NULL,
  peso_kg              NUMERIC(6,2),
  repeticiones         INTEGER,
  completada           BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sesion_series_ejercicio ON sesion_series(sesion_ejercicio_id);

-- ──────────────────────────────────────────────────────────
--  7. MEDICIONES CORPORALES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mediciones (
  id               TEXT    PRIMARY KEY,
  usuario_id       UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha            DATE    NOT NULL,
  peso             NUMERIC(5,1),
  grasa_corporal   NUMERIC(5,2),
  masa_muscular    NUMERIC(5,1),
  imc              NUMERIC(5,2)  GENERATED ALWAYS AS (
                     CASE WHEN altura IS NOT NULL AND altura > 0
                          THEN ROUND((peso / ((altura / 100.0)^2))::NUMERIC, 2)
                          ELSE NULL END
                   ) STORED,
  altura           NUMERIC(5,1),
  cintura          NUMERIC(5,1),
  cadera           NUMERIC(5,1),
  pecho            NUMERIC(5,1),
  brazo_izq        NUMERIC(5,1),
  brazo_der        NUMERIC(5,1),
  muslo_izq        NUMERIC(5,1),
  muslo_der        NUMERIC(5,1),
  pantorrilla_izq  NUMERIC(5,1),
  pantorrilla_der  NUMERIC(5,1),
  cuello           NUMERIC(5,1),
  notas            TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mediciones_usuario ON mediciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_fecha   ON mediciones(fecha);

-- ──────────────────────────────────────────────────────────
--  8. REGISTRO DE COMIDAS / NUTRICIÓN
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comidas (
  id             TEXT    PRIMARY KEY,
  usuario_id     UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha          DATE    NOT NULL,
  tipo           TEXT    CHECK (tipo IN ('desayuno', 'almuerzo', 'merienda', 'cena', 'snack')),
  nombre         TEXT    NOT NULL,
  calorias       NUMERIC(7,1),
  proteinas      NUMERIC(6,1),
  carbohidratos  NUMERIC(6,1),
  grasas         NUMERIC(6,1),
  creado_en      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comidas_usuario ON comidas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comidas_fecha   ON comidas(fecha);

-- ──────────────────────────────────────────────────────────
--  9. FOTOS DE PROGRESO
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fotos_progreso (
  id           TEXT    PRIMARY KEY,
  usuario_id   UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha        DATE    NOT NULL,
  foto_url     TEXT,
  foto_base64  TEXT,
  notas        TEXT,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fotos_usuario ON fotos_progreso(usuario_id);

-- ──────────────────────────────────────────────────────────
--  RLS — Deshabilitado (se filtra por usuario_id en queries)
--  Habilitar cuando se use Supabase Auth
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios        DISABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_ejercicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones        DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_ejercicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_series   DISABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones      DISABLE ROW LEVEL SECURITY;
ALTER TABLE comidas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_progreso  DISABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
--  USUARIO SEED (cambiar password antes de producción)
-- ──────────────────────────────────────────────────────────
INSERT INTO usuarios (id, username, password, nombre, nivel, objetivo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'setto123',
  'Administrador',
  'intermedio',
  'ganar músculo'
) ON CONFLICT (username) DO NOTHING;
