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
