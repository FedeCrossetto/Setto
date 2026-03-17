import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header'
import Card from '../components/ui/Card'
import { photosDB } from '../lib/db'
import { savePhoto, deletePhotoFromStorage, formatDate, getWeekNumber, todayStr } from '../lib/storage'

export default function Progress() {
  const [photos, setPhotos] = useState([])
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [viewPhoto, setViewPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    loadPhotos()
  }, [])

  async function loadPhotos() {
    const all = await photosDB.getAll()
    setPhotos(all.sort((a, b) => (b.date || '').localeCompare(a.date || '')))
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        await savePhoto(file)
      }
    } catch (err) {
      console.error('Error subiendo foto:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
      loadPhotos()
    }
  }

  async function deletePhoto(id) {
    const photo = photos.find(p => p.id === id)
    await deletePhotoFromStorage(photo?.url)
    await photosDB.delete(id)
    setViewPhoto(null)
    loadPhotos()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  // Group photos by week
  const weeks = {}
  photos.forEach(p => {
    const wk = `${p.date?.slice(0, 4)}-W${getWeekNumber(p.date)}`
    if (!weeks[wk]) weeks[wk] = []
    weeks[wk].push(p)
  })

  // Streak calculation
  const uniqueWeeks = new Set(photos.map(p => `${p.date?.slice(0, 4)}-W${getWeekNumber(p.date)}`))
  const currentWeek = `${todayStr().slice(0, 4)}-W${getWeekNumber(todayStr())}`
  let streak = 0
  const year = Number(todayStr().slice(0, 4))
  let wk = getWeekNumber(todayStr())
  while (uniqueWeeks.has(`${year}-W${wk}`) && wk > 0) {
    streak++
    wk--
  }

  const comparePhotos = selected.length === 2
    ? [photos.find(p => p.id === selected[0]), photos.find(p => p.id === selected[1])]
    : null

  const photoUrl = (photo) => photo?.url || null

  return (
    <div className="min-h-full">
      <Header title="Progreso">
        <div className="flex items-center gap-2 pr-1">
          {photos.length >= 2 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setSelected([]) }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shadow-sm ${
                compareMode ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">compare</span>
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-sm disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-lg ${uploading ? 'animate-spin' : ''}`}>
              {uploading ? 'progress_activity' : 'add_a_photo'}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </Header>

      <div className="px-5 pt-5 space-y-4 pb-6">
        {/* Streak */}
        <Card className="bg-primary text-white border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">local_fire_department</span>
            </div>
            <div>
              <p className="text-2xl font-bold">{streak} {streak === 1 ? 'semana' : 'semanas'}</p>
              <p className="text-xs text-white/80">Racha de fotos consecutivas</p>
            </div>
          </div>
        </Card>

        {/* Compare Mode */}
        {compareMode && (
          <Card className="!border-primary border-2">
            <p className="text-xs font-semibold text-primary mb-2">
              {selected.length < 2 ? `Seleccioná ${2 - selected.length} foto${selected.length === 0 ? 's' : ''} para comparar` : 'Comparación Before / After'}
            </p>
            {comparePhotos && (
              <div className="grid grid-cols-2 gap-2">
                {comparePhotos.map((p, i) => (
                  <div key={p.id}>
                    <p className="text-[10px] text-text-secondary text-center mb-1">{i === 0 ? 'Before' : 'After'} — {formatDate(p.date)}</p>
                    <img
                      src={photoUrl(p)}
                      alt=""
                      className="w-full aspect-[3/4] object-cover rounded-xl"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Upload CTA if empty */}
        {photos.length === 0 && (
          <div className="text-center py-16 text-text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 block">photo_camera</span>
            <p className="text-sm font-medium">No tenés fotos de progreso</p>
            <p className="text-xs mt-1 mb-4">Subí tu primera foto para empezar a trackear</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl"
            >
              Subir Foto
            </button>
          </div>
        )}

        {/* Gallery by Week */}
        {Object.entries(weeks).map(([weekKey, weekPhotos]) => (
          <div key={weekKey}>
            <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">
              Semana {weekKey.split('-W')[1]}, {weekKey.split('-W')[0]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {weekPhotos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => compareMode ? toggleSelect(photo.id) : setViewPhoto(photo)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group ${
                    compareMode && selected.includes(photo.id) ? 'ring-3 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {photoUrl(photo) ? (
                    <img src={photoUrl(photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-300">image</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                    <p className="text-[9px] text-white font-medium">{formatDate(photo.date)}</p>
                  </div>
                  {compareMode && selected.includes(photo.id) && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <span className="text-xs font-bold">{selected.indexOf(photo.id) + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Photo Viewer */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setViewPhoto(null)} className="text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-white text-sm font-medium">{formatDate(viewPhoto.date)}</p>
            <button onClick={() => deletePhoto(viewPhoto.id)} className="text-red-400">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {photoUrl(viewPhoto) && (
              <img src={photoUrl(viewPhoto)} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
