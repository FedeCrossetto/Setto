// Supabase Edge Function: buscar-alimento
// - Modo "barcode": busca por código de barras
// - Modo "text": búsqueda por nombre
// Usa Open Food Facts como fuente externa y persiste en la tabla `alimentos`.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type BuscarAlimentoRequest =
  | { mode: 'barcode'; barcode: string }
  | { mode: 'text'; query: string; limit?: number }

type Nutriments = {
  [key: string]: unknown
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
  fiber_100g?: number
  sugars_100g?: number
  sodium_100g?: number
}

function normalizeString(str: string | null | undefined): string | null {
  if (!str) return null
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function mapOpenFoodFactsToAlimento(product: any) {
  const nutriments: Nutriments = product.nutriments || {}

  const calorias = nutriments['energy-kcal_100g'] ?? null
  const proteina_g = nutriments.proteins_100g ?? null
  const carbohidratos_g = nutriments.carbohydrates_100g ?? null
  const grasa_g = nutriments.fat_100g ?? null
  const fibra_g = nutriments.fiber_100g ?? null
  const azucar_g = nutriments.sugars_100g ?? null

  let sodio_mg: number | null = null
  if (typeof nutriments.sodium_100g === 'number') {
    sodio_mg = nutriments.sodium_100g * 1000
  }

  const nombre_display: string =
    product.product_name_es ||
    product.product_name_es_mx ||
    product.product_name_es_ar ||
    product.product_name ||
    ''

  const marca: string | null = product.brands || null
  const codigo_barras: string | null = product.code || null

  const countries: string[] = product.countries_tags || []
  const pais = countries.find((c) => c.toLowerCase().includes('argentina')) ? 'AR' : 'AR'

  const categoria: string | null =
    typeof product.categories === 'string'
      ? product.categories.split(',')[0]?.trim() || null
      : null

  return {
    nombre_display,
    nombre_canonico: normalizeString(nombre_display),
    marca,
    codigo_barras,
    categoria,
    subcategoria: null,
    tipo_alimento: 'marca',
    estado_preparacion: 'listo',
    unidad_base: 'g',
    cantidad_base: 100,
    calorias,
    proteina_g,
    carbohidratos_g,
    grasa_g,
    fibra_g,
    azucar_g,
    sodio_mg,
    pais,
    fuente_datos: 'openfoodfacts',
    fuente_externa: 'openfoodfacts',
    fuente_externa_id: codigo_barras,
    verificado: false,
  }
}

async function handleBarcode(barcode: string) {
  if (!barcode) {
    return jsonResponse({ error: 'barcode requerido' }, 400)
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('alimentos')
    .select('*')
    .eq('codigo_barras', barcode)
    .maybeSingle()

  if (existingError) {
    console.error(existingError)
  }
  if (existing) {
    return jsonResponse({ source: 'db', alimento: existing }, 200)
  }

  const offRes = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
  )
  if (!offRes.ok) {
    return jsonResponse({ error: 'Error consultando Open Food Facts' }, 502)
  }
  const offJson = await offRes.json()

  if (offJson.status !== 1 || !offJson.product) {
    return jsonResponse({ error: 'Producto no encontrado en Open Food Facts' }, 404)
  }

  const row = mapOpenFoodFactsToAlimento(offJson.product)
  const { data: inserted, error } = await supabaseAdmin
    .from('alimentos')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error(error)
    return jsonResponse({ error: 'Error guardando alimento en Supabase' }, 500)
  }

  return jsonResponse({ source: 'openfoodfacts', alimento: inserted }, 200)
}

async function handleTextSearch(query: string, limit = 5) {
  if (!query?.trim()) {
    return jsonResponse({ error: 'query requerida' }, 400)
  }

  const normalized = normalizeString(query)

  const { data: localResults, error: localError } = await supabaseAdmin
    .from('alimentos')
    .select('*')
    .ilike('nombre_display', `%${query}%`)
    .limit(limit)

  if (localError) console.error(localError)

  if (localResults && localResults.length > 0) {
    return jsonResponse({ source: 'db', results: localResults }, 200)
  }

  const params = new URLSearchParams({
    page_size: String(limit),
    search_terms: query,
    'fields':
      'code,product_name,brands,categories,countries_tags,nutriments,product_name_es,product_name_es_ar',
  })

  const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/search?${params.toString()}`)
  if (!offRes.ok) {
    return jsonResponse({ error: 'Error consultando Open Food Facts' }, 502)
  }
  const offJson = await offRes.json()

  const products: any[] = offJson.products || []

  // Preferimos productos marcados para Argentina; si no hay, usamos todos
  let filtered = products.filter((p) =>
    Array.isArray(p.countries_tags) &&
    p.countries_tags.some((c: string) => c.toLowerCase().includes('argentina')),
  )
  if (filtered.length === 0) {
    filtered = products
  }

  const mapped = filtered.map((p) => mapOpenFoodFactsToAlimento(p))

  // Cacheamos en Supabase para que próximas búsquedas salgan de la DB
  if (mapped.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('alimentos')
      .insert(mapped)

    if (insertError) {
      console.error('Error cacheando alimentos desde Open Food Facts', insertError)
    }
  }

  return jsonResponse({ source: 'openfoodfacts', results: mapped }, 200)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // CORS preflight
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Only POST allowed' }, 405)
  }

  let body: BuscarAlimentoRequest
  try {
    body = (await req.json()) as BuscarAlimentoRequest
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400)
  }

  if (body.mode === 'barcode') {
    return handleBarcode(body.barcode)
  }

  if (body.mode === 'text') {
    return handleTextSearch(body.query, body.limit)
  }

  return jsonResponse({ error: 'mode inválido' }, 400)
})

