import { useEffect, useMemo, useState } from 'react'
import { getApi } from '@/lib/api'
import { DEFAULT_LOCAL_MODEL_ID } from '@/shared/openModels.ts'
import type { LocalModelChoice } from '@/shared/types.ts'

const STORAGE = 'higgsfield-local-model'

export function selectedModelId(): string {
  try {
    return localStorage.getItem(STORAGE) || DEFAULT_LOCAL_MODEL_ID
  } catch {
    return DEFAULT_LOCAL_MODEL_ID
  }
}

export function rememberModel(id: string) {
  localStorage.setItem(STORAGE, id)
}

export function useModelLibrary() {
  const api = useMemo(() => getApi(), [])
  const [models, setModels] = useState<LocalModelChoice[]>([])
  const [comfyFolders, setComfyFolders] = useState<string[]>([])
  const [modelId, setModelId] = useState(selectedModelId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void api
      .listLocalModels()
      .then((list) => {
        if (cancelled) return
        setModels(list.models)
        setComfyFolders(list.comfyFolders)
        setError('')
        const stored = selectedModelId()
        const choice = list.models.find((item) => item.id === stored && item.selectable)
        const next = choice?.id ?? DEFAULT_LOCAL_MODEL_ID
        setModelId(next)
        rememberModel(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not read the model library.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  function chooseModel(id: string) {
    const choice = models.find((item) => item.id === id)
    if (choice && !choice.selectable) return
    rememberModel(id)
    setModelId(id)
  }

  const selected = models.find((item) => item.id === modelId) ?? null
  const runnable = models.filter((item) => item.selectable)

  return { models, runnable, selected, comfyFolders, modelId, chooseModel, loading, error }
}
