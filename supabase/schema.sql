-- ============================================================
--  SETTO — Esquema Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
--  1. USUARIOS
--     Business profile table.
--     auth_user_id links to auth.users once Supabase Auth is enabled
--     (Strategy B bridge — nullable until migration is complete).
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT    UNIQUE NOT NULL,
  nombre       TEXT,
  apellido     TEXT,
  edad         INTEGER,
  sexo         TEXT    CHECK (sexo IN ('masculino', 'femenino', 'otro')),
  peso         NUMERIC(5,1),
  altura       NUMERIC(5,1),
  objetivo     TEXT    CHECK (objetivo IN ('perder peso', 'ganar músculo', 'mantener', 'rendimiento')),
  nivel        TEXT    CHECK (nivel IN ('principiante', 'intermedio', 'avanzado')),
  avatar_url   TEXT,
  email        TEXT    UNIQUE,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  auth_user_id UUID    UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────────
--  2. RUTINAS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rutinas (
  id          TEXT    PRIMARY KEY,
  usuario_id  UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre      TEXT    NOT NULL,
  image_url   TEXT,
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
  image_url         TEXT,
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
  image_url         TEXT,
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
  brazo_izq        NUMERIC(5,1),   -- brazo relajado
  brazo_der        NUMERIC(5,1),   -- brazo flexionado
  antebrazo        NUMERIC(5,1),
  muslo_izq        NUMERIC(5,1),   -- muslo superior
  muslo_der        NUMERIC(5,1),   -- muslo medial
  pantorrilla_izq  NUMERIC(5,1),
  pantorrilla_der  NUMERIC(5,1),
  cuello           NUMERIC(5,1),
  cabeza           NUMERIC(5,1),
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
--  RLS — Habilitado. Supabase Auth activo.
--  Políticas definidas en la sección de migraciones al final.
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_series     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comidas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_progreso    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimentos_porciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimentos_alias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comidas_items     ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
--  10. NUTRICIÓN — ALIMENTOS Y COMIDAS DETALLADAS
-- ──────────────────────────────────────────────────────────

-- 10.1 TABLA DE ALIMENTOS BASE

CREATE TABLE IF NOT EXISTS alimentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre_display    TEXT        NOT NULL,
  nombre_canonico   TEXT        NOT NULL,

  marca             TEXT,
  codigo_barras     TEXT,

  categoria         TEXT,
  subcategoria      TEXT,

  tipo_alimento     TEXT        NOT NULL DEFAULT 'generico',  -- generico | marca | receta
  estado_preparacion TEXT       NOT NULL DEFAULT 'crudo',     -- crudo | cocido | listo

  unidad_base       TEXT        NOT NULL DEFAULT 'g',
  cantidad_base     NUMERIC(7,2)   NOT NULL DEFAULT 100,

  calorias          NUMERIC(7,1),
  proteina_g        NUMERIC(6,2),
  carbohidratos_g   NUMERIC(6,2),
  grasa_g           NUMERIC(6,2),

  fibra_g           NUMERIC(6,2),
  azucar_g          NUMERIC(6,2),
  sodio_mg          NUMERIC(8,1),

  pais              TEXT        NOT NULL DEFAULT 'AR',
  fuente_datos      TEXT,

  fuente_externa    TEXT,      -- ej: 'openfoodfacts', 'usda'
  fuente_externa_id TEXT,      -- id/código en la fuente externa

  verificado        BOOLEAN    NOT NULL DEFAULT FALSE,

  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alimentos_cantidad_base_pos CHECK (cantidad_base > 0),
  CONSTRAINT alimentos_unidad_base_valida CHECK (unidad_base IN ('g','ml','unidad'))
);

CREATE INDEX IF NOT EXISTS idx_alimentos_nombre_display ON alimentos(nombre_display);
CREATE INDEX IF NOT EXISTS idx_alimentos_barcode        ON alimentos(codigo_barras);


-- 10.2 PORCIONES

CREATE TABLE IF NOT EXISTS alimentos_porciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  alimento_id        UUID NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,

  nombre_porcion     TEXT,
  unidad             TEXT,

  cantidad           NUMERIC(10,3),
  gramos_equivalente NUMERIC(10,3),

  es_porcion_default BOOLEAN NOT NULL DEFAULT FALSE,

  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alimentos_porciones_cantidad_pos CHECK (cantidad IS NULL OR cantidad > 0),
  CONSTRAINT alimentos_porciones_gramos_pos   CHECK (gramos_equivalente IS NULL OR gramos_equivalente > 0)
);

CREATE INDEX IF NOT EXISTS idx_alimentos_porciones_alimento ON alimentos_porciones(alimento_id);


-- 10.3 ALIAS / SINONIMOS

CREATE TABLE IF NOT EXISTS alimentos_alias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  alimento_id      UUID NOT NULL REFERENCES alimentos(id) ON DELETE CASCADE,

  alias            TEXT NOT NULL,
  alias_normalizado TEXT,

  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alimentos_alias_unicos UNIQUE (alimento_id, alias_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_alimentos_alias_alimento ON alimentos_alias(alimento_id);


-- 10.4 TABLA DE COMIDAS DEL USUARIO (MIGRACIÓN)

-- Renombrar columnas SOLO si existen con los nombres viejos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name = 'comidas' AND column_name = 'nombre'
  ) THEN
    ALTER TABLE comidas RENAME COLUMN nombre TO nombre_comida;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name = 'comidas' AND column_name = 'calorias'
  ) THEN
    ALTER TABLE comidas RENAME COLUMN calorias TO calorias_totales;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name = 'comidas' AND column_name = 'proteinas'
  ) THEN
    ALTER TABLE comidas RENAME COLUMN proteinas TO proteinas_totales;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name = 'comidas' AND column_name = 'carbohidratos'
  ) THEN
    ALTER TABLE comidas RENAME COLUMN carbohidratos TO carbohidratos_totales;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name = 'comidas' AND column_name = 'grasas'
  ) THEN
    ALTER TABLE comidas RENAME COLUMN grasas TO grasas_totales;
  END IF;
END$$;


-- 10.5 ITEMS DENTRO DE LA COMIDA

CREATE TABLE IF NOT EXISTS comidas_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  comida_id       TEXT NOT NULL REFERENCES comidas(id) ON DELETE CASCADE,

  alimento_id     UUID REFERENCES alimentos(id),
  porcion_id      UUID REFERENCES alimentos_porciones(id),

  cantidad        NUMERIC(10,3),
  gramos          NUMERIC(10,3),

  calorias        NUMERIC(7,1),
  proteina_g      NUMERIC(6,2),
  carbohidratos_g NUMERIC(6,2),
  grasa_g         NUMERIC(6,2),

  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT comidas_items_cantidad_pos CHECK (cantidad IS NULL OR cantidad >= 0),
  CONSTRAINT comidas_items_gramos_pos   CHECK (gramos IS NULL OR gramos >= 0),
  CONSTRAINT comidas_items_macros_pos   CHECK (
    (calorias        IS NULL OR calorias        >= 0) AND
    (proteina_g      IS NULL OR proteina_g      >= 0) AND
    (carbohidratos_g IS NULL OR carbohidratos_g >= 0) AND
    (grasa_g         IS NULL OR grasa_g         >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_comidas_items_comida   ON comidas_items(comida_id);
CREATE INDEX IF NOT EXISTS idx_comidas_items_alimento ON comidas_items(alimento_id);


-- 10.6 TRIGGER PARA actualizado_en EN alimentos

CREATE OR REPLACE FUNCTION set_alimentos_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_alimentos_actualizado_en ON alimentos;

CREATE TRIGGER trg_set_alimentos_actualizado_en
BEFORE UPDATE ON alimentos
FOR EACH ROW
EXECUTE FUNCTION set_alimentos_actualizado_en();


-- ──────────────────────────────────────────────────────────
--  MIGRACIONES ADICIONALES (ejecutar si las tablas ya existen)
-- ──────────────────────────────────────────────────────────
ALTER TABLE mediciones ADD COLUMN IF NOT EXISTS antebrazo   NUMERIC(5,1);
ALTER TABLE mediciones ADD COLUMN IF NOT EXISTS cabeza      NUMERIC(5,1);

-- Renombrar gif_url → image_url en tablas de ejercicios
ALTER TABLE rutina_ejercicios  RENAME COLUMN gif_url TO image_url;
ALTER TABLE sesion_ejercicios  RENAME COLUMN gif_url TO image_url;

-- Agregar image_url a rutinas (banner de portada)
ALTER TABLE rutinas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ──────────────────────────────────────────────────────────
--  USUARIO SEED
--  Removed: hardcoded admin credential (security — C4 audit finding).
--  Create users manually via the app or Supabase dashboard.
-- ──────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────
--  AUTH MIGRATION — Strategy B, Step 1
--  Adds bridge column linking usuarios to auth.users.
--  Nullable: existing rows are unaffected.
--  Idempotent: safe to run on a live database that already
--  has this column (IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────────
--  AUTH MIGRATION — Strategy B, Step 2
--  Adds email column required by Supabase Auth.
--  Nullable: existing rows are unaffected until populated.
--  UNIQUE: mirrors Supabase Auth's one-email-per-user rule.
--  Idempotent: safe to run on a live database.
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- ──────────────────────────────────────────────────────────
--  AUTH MIGRATION — Strategy B, Step 3
--  Drop legacy password column.
--  Idempotent: IF EXISTS guard prevents errors on re-run.
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios DROP COLUMN IF EXISTS password;

-- ──────────────────────────────────────────────────────────
--  AUTH MIGRATION — Strategy B, Step 4
--  Helper function: resolves the current auth.uid() to the
--  app-level usuarios.id.
--  STABLE: result is constant within a single query, so
--  Postgres can cache it per RLS evaluation pass.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_usuario_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ──────────────────────────────────────────────────────────
--  AUTH MIGRATION — Strategy B, Step 5
--  Row Level Security policies.
--  Each table: owner = the authenticated user whose
--  auth_user_id maps to the row's usuario_id (or id for
--  the usuarios table itself).
--  DROP POLICY IF EXISTS makes this block idempotent.
-- ──────────────────────────────────────────────────────────

-- 1. usuarios — users can read/write only their own row
DROP POLICY IF EXISTS pol_usuarios_select ON usuarios;
DROP POLICY IF EXISTS pol_usuarios_insert ON usuarios;
DROP POLICY IF EXISTS pol_usuarios_update ON usuarios;
DROP POLICY IF EXISTS pol_usuarios_delete ON usuarios;

CREATE POLICY pol_usuarios_select ON usuarios
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY pol_usuarios_insert ON usuarios
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY pol_usuarios_update ON usuarios
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY pol_usuarios_delete ON usuarios
  FOR DELETE USING (auth_user_id = auth.uid());


-- 2. rutinas
DROP POLICY IF EXISTS pol_rutinas_select ON rutinas;
DROP POLICY IF EXISTS pol_rutinas_insert ON rutinas;
DROP POLICY IF EXISTS pol_rutinas_update ON rutinas;
DROP POLICY IF EXISTS pol_rutinas_delete ON rutinas;

CREATE POLICY pol_rutinas_select ON rutinas
  FOR SELECT USING (usuario_id = current_usuario_id());

CREATE POLICY pol_rutinas_insert ON rutinas
  FOR INSERT WITH CHECK (usuario_id = current_usuario_id());

CREATE POLICY pol_rutinas_update ON rutinas
  FOR UPDATE USING (usuario_id = current_usuario_id());

CREATE POLICY pol_rutinas_delete ON rutinas
  FOR DELETE USING (usuario_id = current_usuario_id());


-- 3. rutina_ejercicios — ownership via parent rutina
DROP POLICY IF EXISTS pol_rutina_ejercicios_select ON rutina_ejercicios;
DROP POLICY IF EXISTS pol_rutina_ejercicios_insert ON rutina_ejercicios;
DROP POLICY IF EXISTS pol_rutina_ejercicios_update ON rutina_ejercicios;
DROP POLICY IF EXISTS pol_rutina_ejercicios_delete ON rutina_ejercicios;

CREATE POLICY pol_rutina_ejercicios_select ON rutina_ejercicios
  FOR SELECT USING (
    rutina_id IN (SELECT id FROM rutinas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_rutina_ejercicios_insert ON rutina_ejercicios
  FOR INSERT WITH CHECK (
    rutina_id IN (SELECT id FROM rutinas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_rutina_ejercicios_update ON rutina_ejercicios
  FOR UPDATE USING (
    rutina_id IN (SELECT id FROM rutinas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_rutina_ejercicios_delete ON rutina_ejercicios
  FOR DELETE USING (
    rutina_id IN (SELECT id FROM rutinas WHERE usuario_id = current_usuario_id())
  );


-- 4. sesiones
DROP POLICY IF EXISTS pol_sesiones_select ON sesiones;
DROP POLICY IF EXISTS pol_sesiones_insert ON sesiones;
DROP POLICY IF EXISTS pol_sesiones_update ON sesiones;
DROP POLICY IF EXISTS pol_sesiones_delete ON sesiones;

CREATE POLICY pol_sesiones_select ON sesiones
  FOR SELECT USING (usuario_id = current_usuario_id());

CREATE POLICY pol_sesiones_insert ON sesiones
  FOR INSERT WITH CHECK (usuario_id = current_usuario_id());

CREATE POLICY pol_sesiones_update ON sesiones
  FOR UPDATE USING (usuario_id = current_usuario_id());

CREATE POLICY pol_sesiones_delete ON sesiones
  FOR DELETE USING (usuario_id = current_usuario_id());


-- 5. sesion_ejercicios — ownership via parent sesion
DROP POLICY IF EXISTS pol_sesion_ejercicios_select ON sesion_ejercicios;
DROP POLICY IF EXISTS pol_sesion_ejercicios_insert ON sesion_ejercicios;
DROP POLICY IF EXISTS pol_sesion_ejercicios_update ON sesion_ejercicios;
DROP POLICY IF EXISTS pol_sesion_ejercicios_delete ON sesion_ejercicios;

CREATE POLICY pol_sesion_ejercicios_select ON sesion_ejercicios
  FOR SELECT USING (
    sesion_id IN (SELECT id FROM sesiones WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_sesion_ejercicios_insert ON sesion_ejercicios
  FOR INSERT WITH CHECK (
    sesion_id IN (SELECT id FROM sesiones WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_sesion_ejercicios_update ON sesion_ejercicios
  FOR UPDATE USING (
    sesion_id IN (SELECT id FROM sesiones WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_sesion_ejercicios_delete ON sesion_ejercicios
  FOR DELETE USING (
    sesion_id IN (SELECT id FROM sesiones WHERE usuario_id = current_usuario_id())
  );


-- 6. sesion_series — ownership via parent sesion_ejercicio → sesion
DROP POLICY IF EXISTS pol_sesion_series_select ON sesion_series;
DROP POLICY IF EXISTS pol_sesion_series_insert ON sesion_series;
DROP POLICY IF EXISTS pol_sesion_series_update ON sesion_series;
DROP POLICY IF EXISTS pol_sesion_series_delete ON sesion_series;

CREATE POLICY pol_sesion_series_select ON sesion_series
  FOR SELECT USING (
    sesion_ejercicio_id IN (
      SELECT se.id FROM sesion_ejercicios se
      JOIN sesiones s ON s.id = se.sesion_id
      WHERE s.usuario_id = current_usuario_id()
    )
  );

CREATE POLICY pol_sesion_series_insert ON sesion_series
  FOR INSERT WITH CHECK (
    sesion_ejercicio_id IN (
      SELECT se.id FROM sesion_ejercicios se
      JOIN sesiones s ON s.id = se.sesion_id
      WHERE s.usuario_id = current_usuario_id()
    )
  );

CREATE POLICY pol_sesion_series_update ON sesion_series
  FOR UPDATE USING (
    sesion_ejercicio_id IN (
      SELECT se.id FROM sesion_ejercicios se
      JOIN sesiones s ON s.id = se.sesion_id
      WHERE s.usuario_id = current_usuario_id()
    )
  );

CREATE POLICY pol_sesion_series_delete ON sesion_series
  FOR DELETE USING (
    sesion_ejercicio_id IN (
      SELECT se.id FROM sesion_ejercicios se
      JOIN sesiones s ON s.id = se.sesion_id
      WHERE s.usuario_id = current_usuario_id()
    )
  );


-- 7. mediciones
DROP POLICY IF EXISTS pol_mediciones_select ON mediciones;
DROP POLICY IF EXISTS pol_mediciones_insert ON mediciones;
DROP POLICY IF EXISTS pol_mediciones_update ON mediciones;
DROP POLICY IF EXISTS pol_mediciones_delete ON mediciones;

CREATE POLICY pol_mediciones_select ON mediciones
  FOR SELECT USING (usuario_id = current_usuario_id());

CREATE POLICY pol_mediciones_insert ON mediciones
  FOR INSERT WITH CHECK (usuario_id = current_usuario_id());

CREATE POLICY pol_mediciones_update ON mediciones
  FOR UPDATE USING (usuario_id = current_usuario_id());

CREATE POLICY pol_mediciones_delete ON mediciones
  FOR DELETE USING (usuario_id = current_usuario_id());


-- 8. comidas
DROP POLICY IF EXISTS pol_comidas_select ON comidas;
DROP POLICY IF EXISTS pol_comidas_insert ON comidas;
DROP POLICY IF EXISTS pol_comidas_update ON comidas;
DROP POLICY IF EXISTS pol_comidas_delete ON comidas;

CREATE POLICY pol_comidas_select ON comidas
  FOR SELECT USING (usuario_id = current_usuario_id());

CREATE POLICY pol_comidas_insert ON comidas
  FOR INSERT WITH CHECK (usuario_id = current_usuario_id());

CREATE POLICY pol_comidas_update ON comidas
  FOR UPDATE USING (usuario_id = current_usuario_id());

CREATE POLICY pol_comidas_delete ON comidas
  FOR DELETE USING (usuario_id = current_usuario_id());


-- 9. fotos_progreso
DROP POLICY IF EXISTS pol_fotos_select ON fotos_progreso;
DROP POLICY IF EXISTS pol_fotos_insert ON fotos_progreso;
DROP POLICY IF EXISTS pol_fotos_update ON fotos_progreso;
DROP POLICY IF EXISTS pol_fotos_delete ON fotos_progreso;

CREATE POLICY pol_fotos_select ON fotos_progreso
  FOR SELECT USING (usuario_id = current_usuario_id());

CREATE POLICY pol_fotos_insert ON fotos_progreso
  FOR INSERT WITH CHECK (usuario_id = current_usuario_id());

CREATE POLICY pol_fotos_update ON fotos_progreso
  FOR UPDATE USING (usuario_id = current_usuario_id());

CREATE POLICY pol_fotos_delete ON fotos_progreso
  FOR DELETE USING (usuario_id = current_usuario_id());


-- ──────────────────────────────────────────────────────────
--  ADMIN ROLE — Step 1: add is_admin flag to usuarios
-- ──────────────────────────────────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Helper: returns TRUE if the current auth user is an admin.
-- STABLE so Postgres can cache it within a single RLS evaluation pass.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

-- 10. alimentos — globally readable; only admins can write
--     (no usuario_id column — shared catalog)
DROP POLICY IF EXISTS pol_alimentos_select ON alimentos;
DROP POLICY IF EXISTS pol_alimentos_insert ON alimentos;
DROP POLICY IF EXISTS pol_alimentos_update ON alimentos;
DROP POLICY IF EXISTS pol_alimentos_delete ON alimentos;

CREATE POLICY pol_alimentos_select ON alimentos
  FOR SELECT USING (true);

CREATE POLICY pol_alimentos_insert ON alimentos
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY pol_alimentos_update ON alimentos
  FOR UPDATE USING (is_admin());

CREATE POLICY pol_alimentos_delete ON alimentos
  FOR DELETE USING (is_admin());


-- 11. alimentos_porciones — readable by all; writable by admins only
DROP POLICY IF EXISTS pol_alimentos_porciones_select ON alimentos_porciones;
DROP POLICY IF EXISTS pol_alimentos_porciones_insert ON alimentos_porciones;
DROP POLICY IF EXISTS pol_alimentos_porciones_update ON alimentos_porciones;
DROP POLICY IF EXISTS pol_alimentos_porciones_delete ON alimentos_porciones;

CREATE POLICY pol_alimentos_porciones_select ON alimentos_porciones
  FOR SELECT USING (true);

CREATE POLICY pol_alimentos_porciones_insert ON alimentos_porciones
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY pol_alimentos_porciones_update ON alimentos_porciones
  FOR UPDATE USING (is_admin());

CREATE POLICY pol_alimentos_porciones_delete ON alimentos_porciones
  FOR DELETE USING (is_admin());


-- 12. alimentos_alias — readable by all; writable by admins only
DROP POLICY IF EXISTS pol_alimentos_alias_select ON alimentos_alias;
DROP POLICY IF EXISTS pol_alimentos_alias_insert ON alimentos_alias;
DROP POLICY IF EXISTS pol_alimentos_alias_update ON alimentos_alias;
DROP POLICY IF EXISTS pol_alimentos_alias_delete ON alimentos_alias;

CREATE POLICY pol_alimentos_alias_select ON alimentos_alias
  FOR SELECT USING (true);

CREATE POLICY pol_alimentos_alias_insert ON alimentos_alias
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY pol_alimentos_alias_update ON alimentos_alias
  FOR UPDATE USING (is_admin());

CREATE POLICY pol_alimentos_alias_delete ON alimentos_alias
  FOR DELETE USING (is_admin());


-- 13. comidas_items — ownership via parent comida
DROP POLICY IF EXISTS pol_comidas_items_select ON comidas_items;
DROP POLICY IF EXISTS pol_comidas_items_insert ON comidas_items;
DROP POLICY IF EXISTS pol_comidas_items_update ON comidas_items;
DROP POLICY IF EXISTS pol_comidas_items_delete ON comidas_items;

CREATE POLICY pol_comidas_items_select ON comidas_items
  FOR SELECT USING (
    comida_id IN (SELECT id FROM comidas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_comidas_items_insert ON comidas_items
  FOR INSERT WITH CHECK (
    comida_id IN (SELECT id FROM comidas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_comidas_items_update ON comidas_items
  FOR UPDATE USING (
    comida_id IN (SELECT id FROM comidas WHERE usuario_id = current_usuario_id())
  );

CREATE POLICY pol_comidas_items_delete ON comidas_items
  FOR DELETE USING (
    comida_id IN (SELECT id FROM comidas WHERE usuario_id = current_usuario_id())
  );
