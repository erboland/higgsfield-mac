export type ReaInspection = {
  available: boolean
  detail: string
  format?: string
  tensors?: number
  fileBytes?: number
  dtypes?: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function findFormat(value: unknown, depth = 0): string | undefined {
  if (depth > 6) return undefined
  const record = asRecord(value)
  if (!record) return undefined
  for (const key of ['format', 'artifact_format', 'kind']) {
    const entry = record[key]
    if (typeof entry === 'string' && /safetensors|gguf/i.test(entry)) return entry
  }
  for (const entry of Object.values(record)) {
    const found = findFormat(entry, depth + 1)
    if (found) return found
  }
  return undefined
}

function findTensors(value: unknown, depth = 0): number | undefined {
  if (depth > 6) return undefined
  const record = asRecord(value)
  if (!record) return undefined
  if (Array.isArray(record.tensors)) return record.tensors.length
  for (const key of ['tensor_count', 'tensors_count', 'count']) {
    const entry = record[key]
    if (typeof entry === 'number' && Number.isFinite(entry)) return entry
  }
  const declared = asRecord(record.declared)
  if (declared && typeof declared.tensors === 'number') return declared.tensors
  for (const entry of Object.values(record)) {
    const found = findTensors(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

function findBytes(value: unknown, depth = 0): number | undefined {
  if (depth > 5) return undefined
  const record = asRecord(value)
  if (!record) return undefined
  for (const key of ['file_size', 'fileBytes', 'size']) {
    const entry = record[key]
    if (typeof entry === 'number' && entry > 1000) return entry
  }
  for (const entry of Object.values(record)) {
    if (entry && typeof entry === 'object') {
      const found = findBytes(entry, depth + 1)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function findDtypes(value: unknown, depth = 0): string[] {
  if (depth > 6) return []
  const record = asRecord(value)
  if (!record) return []
  const direct = record.dtypes ?? record.dtype
  if (Array.isArray(direct)) {
    return direct.filter((item): item is string => typeof item === 'string')
  }
  if (typeof direct === 'string') return [direct]
  const found = new Set<string>()
  for (const entry of Object.values(record)) {
    for (const dtype of findDtypes(entry, depth + 1)) found.add(dtype)
  }
  return [...found]
}

export function summarizeRea(payload: unknown, stderr = ''): ReaInspection {
  const record = asRecord(payload)
  if (!record) {
    const detail = stderr.trim() || 'REA inspection unavailable.'
    return { available: false, detail }
  }
  const format = findFormat(record)
  const tensors = findTensors(record)
  const fileBytes = findBytes(record)
  const dtypes = findDtypes(record).slice(0, 6)
  if (!format && tensors === undefined && fileBytes === undefined) {
    return { available: false, detail: 'REA returned a report this app could not read.' }
  }
  const parts = ['REA inspected the checkpoint header.']
  if (format) parts.push(format)
  if (tensors !== undefined) parts.push(`${tensors} tensors`)
  if (dtypes.length) parts.push(dtypes.join(', '))
  return { available: true, detail: parts.join(' · '), format, tensors, fileBytes, dtypes }
}
