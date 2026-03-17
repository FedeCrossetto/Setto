import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usersDB, measurementsDB } from '../lib/db'
import Header from '../components/Header'
import Card from '../components/ui/Card'

// Redimensiona y comprime la imagen a base64 (máx 300×300, JPEG 85%)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 300
        let { width, height } = img
        if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX } }
        else                { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const OBJETIVOS = {
  'perder peso':    { icon: 'monitor_weight', label: 'Perder peso' },
  'ganar músculo':  { icon: 'fitness_center',  label: 'Ganar músculo' },
  'mantener':       { icon: 'balance',          label: 'Mantener peso' },
  'rendimiento':    { icon: 'sprint',           label: 'Rendimiento' },
}

const NIVELES = {
  'principiante':  { color: 'text-emerald-500', label: 'Principiante' },
  'intermedio':    { color: 'text-amber-500',   label: 'Intermedio' },
  'avanzado':      { color: 'text-red-500',     label: 'Avanzado' },
}

const SEXOS = {
  'masculino': 'Masculino',
  'femenino':  'Femenino',
  'otro':      'Otro',
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d + 'T12:00:00')
  return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-text-secondary text-lg">{icon}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text">{value ?? '—'}</span>
    </div>
  )
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lastMeasDate, setLastMeasDate] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    measurementsDB.getAll().then(data => {
      if (!data.length) return
      const sorted = data.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      setLastMeasDate(sorted[0]?.date ?? null)
    })
  }, [user])

  if (!user) return null

  const initials = ((user.nombre?.[0] || '') + (user.apellido?.[0] || '')).toUpperCase() || user.username?.[0]?.toUpperCase() || '?'
  const objetivo = OBJETIVOS[user.objetivo] || { icon: 'flag', label: user.objetivo || '—' }
  const nivel = NIVELES[user.nivel] || { color: 'text-text', label: user.nivel || '—' }
  const imc = user.peso && user.altura
    ? (user.peso / ((user.altura / 100) ** 2)).toFixed(1)
    : null

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const base64 = await compressImage(file)
      const updated = { ...user, avatar: base64 }
      await usersDB.save(updated)
      refreshUser(updated)
    } catch (err) {
      console.error('Error al procesar foto:', err)
    } finally {
      setUploadingPhoto(false)
      // Reset input so the same file can be selected again
      e.target.value = ''
    }
  }

  async function removePhoto() {
    const updated = { ...user, avatar: null }
    await usersDB.save(updated)
    refreshUser(updated)
  }

  function startEdit() {
    setForm({
      nombre:        user.nombre        || '',
      apellido:      user.apellido      || '',
      edad:          user.edad          || '',
      sexo:          user.sexo          || 'masculino',
      peso:          user.peso          || '',
      altura:        user.altura        || '',
      objetivo:      user.objetivo      || 'ganar músculo',
      nivel:         user.nivel         || 'intermedio',
      metaCalorias:  user.metaCalorias  || '',
      metaProteinas: user.metaProteinas || '',
      metaCarbos:    user.metaCarbos    || '',
      metaGrasas:    user.metaGrasas    || '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const updated = {
        ...user,
        ...form,
        edad:          form.edad          ? Number(form.edad)          : null,
        peso:          form.peso          ? Number(form.peso)          : null,
        altura:        form.altura        ? Number(form.altura)        : null,
        metaCalorias:  form.metaCalorias  ? Number(form.metaCalorias)  : null,
        metaProteinas: form.metaProteinas ? Number(form.metaProteinas) : null,
        metaCarbos:    form.metaCarbos    ? Number(form.metaCarbos)    : null,
        metaGrasas:    form.metaGrasas    ? Number(form.metaGrasas)    : null,
      }
      await usersDB.save(updated)
      refreshUser(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full">
      <Header title="Mi Perfil" />

      <div className="px-5 pt-5 pb-6 space-y-4">
        {/* Avatar + nombre */}
        <div className="flex flex-col items-center py-4">
          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {/* Avatar clickeable */}
          <div className="relative mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden bg-primary/15 flex items-center justify-center active:scale-95 transition-transform"
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
              ) : user.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-primary">{initials}</span>
              )}
            </button>

            {/* Badge editar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-card rounded-full flex items-center justify-center shadow-md border-2 border-primary"
              disabled={uploadingPhoto}
            >
              <span className="material-symbols-outlined text-primary text-sm">photo_camera</span>
            </button>
          </div>

          <h2 className="text-xl font-bold text-text">
            {[user.nombre, user.apellido].filter(Boolean).join(' ') || user.username}
          </h2>
          <span className={`text-xs font-semibold mt-0.5 ${nivel.color}`}>
            {nivel.label}
          </span>

          {/* Quitar foto */}
          {user.avatar && !uploadingPhoto && (
            <button
              onClick={removePhoto}
              className="mt-2 text-[11px] text-text-secondary hover:text-red-400 transition-colors"
            >
              Quitar foto
            </button>
          )}
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Peso', value: user.peso ? `${user.peso} kg` : '—', icon: 'monitor_weight', showDate: true },
            { label: 'Altura', value: user.altura ? `${user.altura} cm` : '—', icon: 'height', showDate: false },
            { label: 'IMC', value: imc || '—', icon: 'analytics', showDate: true },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
              <span className="material-symbols-outlined text-primary text-lg block mb-1">{s.icon}</span>
              <p className="text-base font-bold text-text">{s.value}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{s.label}</p>
              {s.showDate && lastMeasDate && (
                <p className="text-[8px] text-text-secondary/60 mt-0.5">{fmtDate(lastMeasDate)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Datos personales */}
        <Card>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">
            Datos personales
          </h3>
          <InfoRow icon="person"       label="Usuario"  value={user.username} />
          <InfoRow icon="cake"         label="Edad"     value={user.edad ? `${user.edad} años` : null} />
          <InfoRow icon="wc"           label="Sexo"     value={SEXOS[user.sexo] || user.sexo} />
          <InfoRow icon={objetivo.icon} label="Objetivo" value={objetivo.label} />
        </Card>

        {/* Botón editar */}
        {!editing ? (
          <button
            onClick={startEdit}
            className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-xl text-sm font-semibold text-text hover:border-primary/40 transition-colors"
          >
            <span className="material-symbols-outlined text-lg text-primary">edit</span>
            Editar perfil
          </button>
        ) : (
          <Card>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">
              Editar perfil
            </h3>
            <div className="space-y-3">
              {[
                { key: 'nombre',   label: 'Nombre',   type: 'text' },
                { key: 'apellido', label: 'Apellido', type: 'text' },
                { key: 'edad',     label: 'Edad',     type: 'number' },
                { key: 'peso',     label: 'Peso (kg)', type: 'number' },
                { key: 'altura',   label: 'Altura (cm)', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    inputMode={f.type === 'number' ? 'numeric' : 'text'}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
              ))}

              {/* Sexo */}
              <div>
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">Sexo</label>
                <div className="flex gap-2">
                  {Object.entries(SEXOS).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, sexo: val }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${form.sexo === val ? 'bg-primary text-white' : 'bg-bg border border-border text-text-secondary'}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Objetivo */}
              <div>
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">Objetivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(OBJETIVOS).map(([val, { icon, label }]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, objetivo: val }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${form.objetivo === val ? 'bg-primary text-white' : 'bg-bg border border-border text-text-secondary'}`}
                    >
                      <span className="material-symbols-outlined text-base">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel */}
              <div>
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">Nivel</label>
                <div className="flex gap-2">
                  {Object.entries(NIVELES).map(([val, { label }]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, nivel: val }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${form.nivel === val ? 'bg-primary text-white' : 'bg-bg border border-border text-text-secondary'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metas nutricionales */}
              <div className="pt-1">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-2">Metas nutricionales</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'metaCalorias',  label: 'Calorías (kcal)' },
                    { key: 'metaProteinas', label: 'Proteínas (g)' },
                    { key: 'metaCarbos',    label: 'Carbos (g)' },
                    { key: 'metaGrasas',    label: 'Grasas (g)' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                        {f.label}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-bg border border-border text-text-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </Card>
        )}

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
