export type ValueKind = 'inr' | 'count'

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function formatInr(cents: number): string {
  const rupees = cents / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

export function formatByKind(kind: ValueKind, value: number): string {
  return kind === 'inr' ? formatInr(value) : formatCount(value)
}

export function formatDelta(kind: ValueKind, from: number, to: number): string {
  const delta = to - from
  if (delta === 0) return 'No change'
  const rendered = formatByKind(kind, Math.abs(delta))
  return delta > 0 ? `+${rendered}` : `−${rendered}`
}

export function formatDay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function dedent(value: string): string {
  const lines = value.replace(/^\n/, '').replace(/\s+$/, '').split('\n')
  const indents = lines.filter((line) => line.trim().length > 0).map((line) => line.match(/^ */)?.[0].length ?? 0)
  const pad = indents.length ? Math.min(...indents) : 0
  return lines
    .map((line) => line.slice(pad))
    .join('\n')
    .trim()
}
