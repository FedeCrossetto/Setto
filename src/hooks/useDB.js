import { useState, useEffect, useCallback } from 'react'

export function useDB(dbModule, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await dbModule.getAll()
      setData(result)
    } catch (err) {
      console.error('useDB error:', err)
    } finally {
      setLoading(false)
    }
  }, [dbModule])

  useEffect(() => {
    refresh()
  }, [...deps, refresh])

  const save = useCallback(async (item) => {
    const saved = await dbModule.save(item)
    await refresh()
    return saved
  }, [dbModule, refresh])

  const remove = useCallback(async (id) => {
    await dbModule.delete(id)
    await refresh()
  }, [dbModule, refresh])

  return { data, loading, refresh, save, remove }
}

export function useSetting(key, defaultValue) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    import('../lib/db.js').then(({ settingsDB }) => {
      settingsDB.get(key).then((v) => {
        if (v !== undefined) setValue(v)
        setLoading(false)
      })
    })
  }, [key])

  const update = useCallback(async (newValue) => {
    const { settingsDB } = await import('../lib/db.js')
    await settingsDB.set(key, newValue)
    setValue(newValue)
  }, [key])

  return [value, update, loading]
}
