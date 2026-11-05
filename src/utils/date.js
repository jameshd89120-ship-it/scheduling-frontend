export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function toMin(hhmm) {
  if (!hhmm) return 0
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

export function dayKeyToDate(dayKey, weekStart) {
  const idx = DAY_KEYS.indexOf(dayKey)
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + idx)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function dateToDayKey(dateStr, weekStart) {
  const start = new Date(weekStart + 'T00:00:00')
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d - start) / 86400000)
  return DAY_KEYS[diff] || null
}

export function dayOfWeekToDayKey(dow) {
  return DAY_KEYS[dow - 1]
}

export function dayKeyToDayOfWeek(dayKey) {
  return DAY_KEYS.indexOf(dayKey) + 1
}

export function calcPreview(startTime, endTime, breakHours) {
  const s = toMin(startTime)
  const e = toMin(endTime)
  const bm = Number(breakHours) * 60
  const work = e - s - bm
  if (work <= 0) return null
  const half = Math.floor(work / 2 / 30) * 30
  const segments = [
    { type: 'work', start: toHHMM(s), end: toHHMM(s + half), minutes: half },
    { type: 'break', start: toHHMM(s + half), end: toHHMM(s + half + bm), minutes: bm },
    { type: 'work', start: toHHMM(s + half + bm), end: toHHMM(e), minutes: work - half }
  ]
  return {
    segments,
    totalWork: (work / 60).toFixed(1),
    totalSpan: ((e - s) / 60).toFixed(1)
  }
}