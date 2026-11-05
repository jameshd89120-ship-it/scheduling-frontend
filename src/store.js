import { reactive } from 'vue'
import {
  listEmployees,
  getAvailability,
  getSchedule
} from '@/api/scheduling'
import {
  DAY_KEYS,
  dateToDayKey,
  dayOfWeekToDayKey
} from '@/utils/date'

export const store = reactive({
  weekStart: getMonday(new Date()),
  employees: [],
  availability: {},   // empId -> { mon: true/false }
  schedule: {},       // empId -> { mon: cell | null }
  issues: [],
  loading: false,
  settings: {
    openTime: '08:30',
    closeTime: '23:30',
    needPerSlot: 2,
    workHours: 8,
    breakHours: 1.5,
    maxDaysPerWeek: 5,
    maxHoursPerDay: 120,
    lunchStart: '10:30',
    lunchEnd: '13:30',
    lunchNeed: 4,
    dinnerStart: '16:30',
    dinnerEnd: '19:30',
    dinnerNeed: 4
  }
})

function getMonday(d) {
  const dt = new Date(d)
  const day = dt.getDay() || 7
  dt.setDate(dt.getDate() - day + 1)
  const p = n => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

function initEmployeePlaceholder() {
  // 🚨 核心修复：在请求其他数据前，先给每个员工占位，防止 UI 渲染 undefined 报错
  store.employees.forEach(e => {
    if (!store.availability[e.id]) {
      store.availability[e.id] = {}
      DAY_KEYS.forEach(k => { store.availability[e.id][k] = false })
    }
    if (!store.schedule[e.id]) {
      store.schedule[e.id] = {}
      DAY_KEYS.forEach(k => { store.schedule[e.id][k] = null })
    }
  })
}

function cellsToScheduleMap(cells) {
  const map = {}
  store.employees.forEach(e => {
    map[e.id] = {}
    DAY_KEYS.forEach(k => { map[e.id][k] = null })
  })
  ;(cells || []).forEach(c => {
    const dayKey = dateToDayKey(c.scheduleDate, store.weekStart)
    if (dayKey && map[c.employeeId]) {
      map[c.employeeId][dayKey] = c
    }
  })
  return map
}

function cellsToAvailabilityMap(cells) {
  const map = {}
  store.employees.forEach(e => {
    map[e.id] = {}
    DAY_KEYS.forEach(k => { map[e.id][k] = false })
  })
  ;(cells || []).forEach(c => {
    const dayKey = dayOfWeekToDayKey(c.dayOfWeek)
    if (dayKey && map[c.employeeId]) {
      map[c.employeeId][dayKey] = !!c.available
    }
  })
  return map
}

/* 首次加载 */
export async function loadAll() {
  store.loading = true
  try {
    const employees = await listEmployees()
    store.employees = employees || []
    
    // 先占位，防止下面 await 期间页面渲染报错
    initEmployeePlaceholder()

    const [avail, sched] = await Promise.all([
      getAvailability(store.weekStart),
      getSchedule(store.weekStart)
    ])
    store.availability = cellsToAvailabilityMap(avail ? avail.cells : [])
    store.schedule = cellsToScheduleMap(sched ? sched.cells : [])
    store.issues = sched ? (sched.issues || []) : []
  } catch (e) {
    console.error('加载数据异常：', e)
  } finally {
    store.loading = false
  }
}

/* 切换周 */
export async function changeWeek(delta) {
  const d = new Date(store.weekStart + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  const p = n => String(n).padStart(2, '0')
  store.weekStart = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  store.loading = true
  try {
    initEmployeePlaceholder() // 🚨 同样先占位
    
    const [avail, sched] = await Promise.all([
      getAvailability(store.weekStart),
      getSchedule(store.weekStart)
    ])
    store.availability = cellsToAvailabilityMap(avail ? avail.cells : [])
    store.schedule = cellsToScheduleMap(sched ? sched.cells : [])
    store.issues = sched ? (sched.issues || []) : []
  } catch (e) {
    console.error('切换周加载数据异常：', e)
  } finally {
    store.loading = false
  }
}

/* 排班响应写回 store */
export function applyScheduleResponse(data) {
  store.schedule = cellsToScheduleMap(data.cells)
  store.issues = data.issues || []
}