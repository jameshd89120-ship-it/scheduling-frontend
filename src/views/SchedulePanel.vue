<template>
  <div>
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="tool-left">
        <span class="field">每时段需
          <el-input-number v-model="store.settings.needPerSlot" :min="1" :max="20" size="small" controls-position="right" style="width:76px" />人
        </span>
        <span class="field">工时
          <el-input-number v-model="store.settings.workHours" :min="1" :max="12" :step="1" size="small" controls-position="right" style="width:80px" />h
        </span>
        <span class="field">休息
          <el-input-number v-model="store.settings.breakHours" :min="0" :max="4" :step="0.5" size="small" controls-position="right" style="width:80px" />h
        </span>
        <span class="field">每周最多
          <el-input-number v-model="store.settings.maxDaysPerWeek" :min="1" :max="7" size="small" controls-position="right" style="width:76px" />天
        </span>
        
        <!-- 🚨 新增餐期参数配置 -->
        <span class="field" style="color: #409eff; font-weight: 500;">
          午餐({{ store.settings.lunchStart }}-{{ store.settings.lunchEnd }})
          <el-input-number v-model="store.settings.lunchNeed" :min="1" :max="30" size="small" controls-position="right" style="width:70px" />人
        </span>
        <span class="field" style="color: #e6a23c; font-weight: 500;">
          晚餐({{ store.settings.dinnerStart }}-{{ store.settings.dinnerEnd }})
          <el-input-number v-model="store.settings.dinnerNeed" :min="1" :max="30" size="small" controls-position="right" style="width:70px" />人
        </span>
      </div>

      <div class="tool-right">
        <el-tag :type="store.issues.length ? 'warning' : 'success'" effect="plain">
          {{ store.issues.length ? store.issues.length + ' 条提示' : '校验通过' }}
        </el-tag>
        <el-button type="primary" size="small" :loading="generating" @click="onGenerate">自动排班</el-button>
        <el-button size="small" @click="onClear">清空</el-button>
      </div>
    </div>

    <!-- 排班网格 -->
    <div class="grid-wrap">
      <table class="schedule-grid">
        <thead>
          <tr>
            <th class="sticky-col">员工</th>
            <th v-for="(label, i) in DAY_LABELS" :key="i">
              <div>{{ label }}</div>
              <div class="day-sub">{{ dayDate(i) }}</div>
            </th>
            <th style="min-width:80px">周工时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in store.employees" :key="e.id">
            <td class="sticky-col">
              <div class="emp-name">{{ e.name }}</div>
              <div class="emp-pos">{{ e.position }}</div>
            </td>
            <td v-for="dayKey in DAY_KEYS" :key="dayKey">
              <div class="cell" :class="cellClass(e.id, dayKey)" @click="openEdit(e, dayKey)">
                <template v-if="entryOf(e.id, dayKey)">
                  <span class="time-main">
                    {{ entryOf(e.id, dayKey).startTime }}–{{ entryOf(e.id, dayKey).endTime }}
                  </span>
                  <span class="time-break">
                    休 {{ entryOf(e.id, dayKey).breakStart }}–{{ entryOf(e.id, dayKey).breakEnd }}
                  </span>
                  <span class="time-work">工 {{ workHoursOf(e.id, dayKey) }}h</span>
                </template>
                <template v-else>
                  <!-- 🚨 加上了可选链 ?. 防止空指针报错 -->
                  <span>{{ store.availability[e.id]?.[dayKey] ? '休' : '—' }}</span>
                </template>
                <span v-if="isLateChain(e.id, dayKey)" class="dot"></span>
              </div>
            </td>
            <td class="week-hours" :class="{ over: isOverWeek(e) }">
              {{ empWeekHours[e.id]?.toFixed(1) || '0.0' }}h
              <span class="days">/ {{ empWeekDays[e.id] || 0 }}天</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="sticky-col">当日人数 / 工时</td>
            <td v-for="dayKey in DAY_KEYS" :key="dayKey">
              {{ dayStats[dayKey]?.persons || 0 }}人 · {{ dayStats[dayKey]?.hours.toFixed(1) || '0.0' }}h
            </td>
            <td>{{ totalHours.toFixed(1) }}h</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 覆盖热力图 -->
    <div class="coverage-card">
      <div class="coverage-head">
        <div class="coverage-title">
          📊 在岗覆盖
          <el-radio-group v-model="covDay" size="small">
            <!-- 🚨 修复警告：把 :label 改为 :value -->
            <el-radio-button v-for="(label, i) in DAY_LABELS" :key="i" :value="DAY_KEYS[i]">{{ label }}</el-radio-button>
          </el-radio-group>
        </div>
        <div class="cov-legend">
          <span><i style="background:#67c23a"></i>达标</span>
          <span><i style="background:#e6a23c"></i>差1人</span>
          <span><i style="background:#f56c6c"></i>缺人</span>
        </div>
      </div>
      <div class="coverage-bar">
        <div v-for="(v, i) in coverageSlots" :key="i" class="cov-slot"
             :style="covSlotStyle(v, i)" :title="slotTitle(i, v)">
          {{ v }}
        </div>
      </div>
      <div class="coverage-axis">
        <span>{{ store.settings.openTime }}</span>
        <span>{{ midTime }}</span>
        <span>{{ store.settings.closeTime }}</span>
      </div>
    </div>

    <!-- 校验提示 -->
    <div class="issue-panel" v-if="store.issues.length">
      <div class="issue-title">⚠ 校验提示（{{ store.issues.length }}）</div>
      <ul class="issue-list">
        <li v-for="(it, i) in store.issues" :key="i" :class="it.level">{{ it.message }}</li>
      </ul>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑排班" width="460px">
      <div v-if="editContext" style="margin-bottom:12px;color:#606266;font-size:13px">
        员工：<b>{{ editContext.emp.name }}</b>
        &nbsp;·&nbsp;
        日期：<b>{{ DAY_LABELS[DAY_KEYS.indexOf(editContext.dayKey)] }} {{ editContext.dateStr }}</b>
      </div>
      <el-form label-width="90px" size="small">
        <el-form-item label="上班时间">
          <el-time-select v-model="editForm.startTime" start="08:30" step="00:30" end="23:00" placeholder="上班" />
        </el-form-item>
        <el-form-item label="下班时间">
          <el-time-select v-model="editForm.endTime" start="09:00" step="00:30" end="23:30" placeholder="下班" />
        </el-form-item>
        <el-form-item label="休息时长">
          <el-input-number v-model="editForm.breakHours" :min="0" :max="4" :step="0.5" controls-position="right" /> 小时
        </el-form-item>
      </el-form>
      <div v-if="editPreview" class="preview-box">
        <span v-for="(seg, i) in editPreview.segments" :key="i"
              class="preview-seg" :class="seg.type === 'work' ? 'seg-work' : 'seg-break'">
          {{ seg.type === 'work' ? '工作' : '休息' }} {{ seg.start }}–{{ seg.end }}
        </span>
        <span class="preview-total">在岗 {{ editPreview.totalWork }}h / 到店 {{ editPreview.totalSpan }}h</span>
      </div>
      <template #footer>
        <el-button size="small" v-if="hasExisting" type="danger" plain @click="onDelete">删除排班</el-button>
        <el-button size="small" @click="editVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="onConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { store, applyScheduleResponse } from '@/store'
import {
  DAY_KEYS, DAY_LABELS, toMin, toHHMM,
  dayKeyToDate, calcPreview
} from '@/utils/date'
import {
  generateScheduleApi, updateCellApi, clearScheduleApi
} from '@/api/scheduling'

const LATE_MIN = 22 * 60
const SLOT = 30

export default {
  setup() {
    const covDay = ref('mon')
    const generating = ref(false)
    const saving = ref(false)
    const editVisible = ref(false)
    const editContext = ref(null)
    const editForm = reactive({ startTime: '', endTime: '', breakHours: 1.5 })

    function dayDate(i) {
      const d = new Date(store.weekStart + 'T00:00:00')
      d.setDate(d.getDate() + i)
      return `${d.getMonth() + 1}/${d.getDate()}`
    }

    function entryOf(empId, dayKey) {
      return store.schedule[empId]?.[dayKey] || null
    }
    function workHoursOf(empId, dayKey) {
      const c = entryOf(empId, dayKey)
      return c ? Number(c.workHours || 0).toFixed(1) : '0.0'
    }

    const empWeekDays = computed(() => {
      const map = {}
      store.employees.forEach(e => {
        let d = 0
        DAY_KEYS.forEach(k => { if (entryOf(e.id, k)) d++ })
        map[e.id] = d
      })
      return map
    })

    const empWeekHours = computed(() => {
      const map = {}
      store.employees.forEach(e => {
        let h = 0
        DAY_KEYS.forEach(k => {
          const c = entryOf(e.id, k)
          if (c) h += Number(c.workHours || 0)
        })
        map[e.id] = h
      })
      return map
    })

    const dayStats = computed(() => {
      const map = {}
      DAY_KEYS.forEach(k => {
        let persons = 0
        let hours = 0
        store.employees.forEach(e => {
          const c = entryOf(e.id, k)
          if (c) { persons++; hours += Number(c.workHours || 0) }
        })
        map[k] = { persons, hours }
      })
      return map
    })

    const totalHours = computed(() =>
      DAY_KEYS.reduce((s, k) => s + (dayStats.value[k]?.hours || 0), 0)
    )

    /* 覆盖热力 */
    const coverageSlots = computed(() => {
      const S = store.settings
      const open = toMin(S.openTime)
      const close = toMin(S.closeTime)
      const total = Math.round((close - open) / SLOT)
      const slots = new Array(total).fill(0)
      
      store.employees.forEach(e => {
        const c = entryOf(e.id, covDay.value)
        if (!c) return
        const s = toMin(c.startTime)
        const eMin = toMin(c.endTime)
        const workMin = eMin - s - Number(c.breakHours) * 60
        if (workMin <= 0) return
        
        const startSlot = (s - open) / SLOT
        const workSlots = Math.round(workMin / SLOT)
        const breakSlots = Math.round(Number(c.breakHours) * 60 / SLOT)
        const firstHalf = Math.floor(workSlots / 2)
        const secondHalf = workSlots - firstHalf
        
        for (let i = 0; i < firstHalf; i++) {
          const idx = startSlot + i
          if (idx >= 0 && idx < total) slots[idx]++
        }
        for (let i = 0; i < secondHalf; i++) {
          const idx = startSlot + firstHalf + breakSlots + i
          if (idx >= 0 && idx < total) slots[idx]++
        }
      })
      return slots
    })

    const midTime = computed(() => {
      const o = toMin(store.settings.openTime)
      const c = toMin(store.settings.closeTime)
      return toHHMM(Math.round((o + c) / 2 / SLOT) * SLOT)
    })

    function getNeedAtSlot(i) {
      const S = store.settings
      const openMin = toMin(S.openTime)
      const currentMin = openMin + i * SLOT
      
      const lunchStart = toMin(S.lunchStart)
      const lunchEnd = toMin(S.lunchEnd)
      const dinnerStart = toMin(S.dinnerStart)
      const dinnerEnd = toMin(S.dinnerEnd)

      if (currentMin >= lunchStart && currentMin < lunchEnd) return S.lunchNeed
      if (currentMin >= dinnerStart && currentMin < dinnerEnd) return S.dinnerNeed
      return S.needPerSlot
    }

    function covSlotStyle(v, i) {
      const need = getNeedAtSlot(i)
      if (v >= need) return { background: '#67c23a' }
      if (v >= need - 1) return { background: '#e6a23c' }
      return { background: '#f56c6c' }
    }

    function slotTitle(i, v) {
      const o = toMin(store.settings.openTime)
      const need = getNeedAtSlot(i)
      return `${toHHMM(o + i * SLOT)}–${toHHMM(o + (i + 1) * SLOT)} 在岗 ${v} 人 (需求 ${need} 人)`
    }

    /* 单元格样式 */
    function cellClass(empId, dayKey) {
      const c = entryOf(empId, dayKey)
      const avail = store.availability[empId]?.[dayKey]
      const conflict = store.issues.some(it =>
        it.level === 'error' && it.employeeId === empId && it.date === dayKeyToDate(dayKey, store.weekStart)
      )
      return {
        empty: !c,
        'not-available': !avail,
        'has-conflict': conflict
      }
    }

    function isLateChain(empId, dayKey) {
      const idx = DAY_KEYS.indexOf(dayKey)
      if (idx <= 0) return false
      const prev = entryOf(empId, DAY_KEYS[idx - 1])
      const cur = entryOf(empId, dayKey)
      if (!prev || !cur) return false
      return toMin(prev.endTime) >= LATE_MIN && toMin(cur.endTime) >= LATE_MIN
    }

    function maxDaysFor(e) {
      const S = store.settings
      if (e.maxHoursPerWeek > 0 && S.workHours > 0) {
        return Math.min(S.maxDaysPerWeek, Math.floor(e.maxHoursPerWeek / S.workHours))
      }
      return S.maxDaysPerWeek
    }
    function isOverWeek(e) {
      return (empWeekDays.value[e.id] || 0) > maxDaysFor(e)
    }

    /* 编辑 */
    const hasExisting = computed(() =>
      editContext.value && entryOf(editContext.value.emp.id, editContext.value.dayKey)
    )

    function openEdit(emp, dayKey) {
      const idx = DAY_KEYS.indexOf(dayKey)
      const dateStr = dayKeyToDate(dayKey, store.weekStart)
      editContext.value = { emp, dayKey, dateStr, idx }
      const c = entryOf(emp.id, dayKey)
      if (c) {
        editForm.startTime = c.startTime
        editForm.endTime = c.endTime
        editForm.breakHours = Number(c.breakHours)
      } else {
        editForm.startTime = '09:00'
        editForm.endTime = '18:30'
        editForm.breakHours = store.settings.breakHours
      }
      editVisible.value = true
    }

    const editPreview = computed(() =>
      calcPreview(editForm.startTime, editForm.endTime, editForm.breakHours)
    )

    async function onConfirm() {
      if (!editForm.startTime || !editForm.endTime) {
        ElMessage.warning('请选择上下班时间')
        return
      }
      if (toMin(editForm.endTime) <= toMin(editForm.startTime)) {
        ElMessage.warning('下班时间需晚于上班时间')
        return
      }
      saving.value = true
      try {
        const res = await updateCellApi({
          employeeId: editContext.value.emp.id,
          scheduleDate: editContext.value.dateStr,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          breakHours: editForm.breakHours,
          settings: store.settings
        })
        if (!store.schedule[editContext.value.emp.id]) {
          store.schedule[editContext.value.emp.id] = {}
        }
        store.schedule[editContext.value.emp.id][editContext.value.dayKey] = res.cell
        store.issues = res.issues || []
        ElMessage.success('已保存')
        editVisible.value = false
      } catch(e) {
        console.error(e)
      } finally {
        saving.value = false
      }
    }

    async function onDelete() {
      saving.value = true
      try {
        const res = await updateCellApi({
          employeeId: editContext.value.emp.id,
          scheduleDate: editContext.value.dateStr,
          startTime: null
        })
        if (store.schedule[editContext.value.emp.id]) {
          store.schedule[editContext.value.emp.id][editContext.value.dayKey] = null
        }
        store.issues = res.issues || []
        ElMessage.success('已删除')
        editVisible.value = false
      } catch(e) {
        console.error(e)
      } finally {
        saving.value = false
      }
    }

    /* 自动 / 清空 */
    async function onGenerate() {
      if (generating.value) return
      generating.value = true
      try {
        const res = await generateScheduleApi(store.weekStart, store.settings)
        applyScheduleResponse(res)
        ElMessage.success('已重新排班')
      } catch(e) {
        console.error(e)
      } finally {
        generating.value = false
      }
    }

    async function onClear() {
      try {
        await clearScheduleApi(store.weekStart)
        store.employees.forEach(e => {
          if(!store.schedule[e.id]) store.schedule[e.id] = {}
          DAY_KEYS.forEach(k => { store.schedule[e.id][k] = null })
        })
        store.issues = []
        ElMessage.info('已清空本周排班')
      } catch(e) {
        console.error(e)
      }
    }

    return {
      store, DAY_KEYS, DAY_LABELS,
      covDay, coverageSlots, midTime, covSlotStyle, slotTitle,
      dayDate, entryOf, workHoursOf, empWeekDays, empWeekHours,
      dayStats, totalHours, cellClass, isLateChain, isOverWeek,
      generating, saving, editVisible, editContext, editForm,
      editPreview, hasExisting, openEdit, onConfirm, onDelete,
      onGenerate, onClear
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.tool-left, .tool-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.field { font-size: 13px; color: #606266; display: flex; align-items: center; gap: 6px; }

.grid-wrap { overflow-x: auto; }
table.schedule-grid {
  width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px;
  min-width: 1040px;
}
.schedule-grid th, .schedule-grid td {
  border-bottom: 1px solid #ebeef5; border-right: 1px solid #ebeef5;
  padding: 4px; text-align: center; vertical-align: middle;
}
.schedule-grid thead th { background: #f5f7fa; font-weight: 600; color: #606266; }
.schedule-grid tfoot td { background: #fafafa; font-weight: 600; color: #606266; }
.schedule-grid .sticky-col {
  position: sticky; left: 0; background: #fff; z-index: 1;
  text-align: left; min-width: 112px; padding-left: 12px;
}
.schedule-grid thead .sticky-col { background: #f5f7fa; z-index: 3; }
.schedule-grid tfoot .sticky-col { background: #fafafa; }
.emp-name { font-weight: 600; color: #303133; }
.emp-pos { font-size: 11px; color: #909399; margin-top: 2px; }
.day-sub { font-size: 11px; font-weight: 400; color: #909399; margin-top: 2px; }

.cell {
  min-height: 52px; padding: 3px 4px; border-radius: 6px; cursor: pointer;
  user-select: none; transition: filter .15s; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  line-height: 1.35;
}
.cell:hover { filter: brightness(0.96); }
.cell.empty { color: #c0c4cc; font-size: 12px; }
.cell.not-available {
  background-image: repeating-linear-gradient(45deg, transparent, transparent 4px,
    rgba(0,0,0,.035) 4px, rgba(0,0,0,.035) 8px);
}
.cell.has-conflict { box-shadow: inset 0 0 0 2px #f56c6c; }
.cell .time-main { font-size: 12px; font-weight: 600; color: #409eff; }
.cell .time-break { font-size: 10.5px; color: #e6a23c; margin-top: 1px; }
.cell .time-work { font-size: 10.5px; color: #909399; margin-top: 1px; }
.cell .dot { position: absolute; top: 4px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: #e6a23c; }

.week-hours { font-weight: 600; color: #606266; white-space: nowrap; font-size: 12px; }
.week-hours .days { font-weight: 400; font-size: 11px; color: #909399; }
.week-hours.over { color: #f56c6c; }

.coverage-card { margin-top: 16px; border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; }
.coverage-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;}
.coverage-title { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.coverage-bar { display: flex; gap: 1px; height: 30px; }
.cov-slot {
  flex: 1; border-radius: 2px; display: flex; align-items: center;
  justify-content: center; font-size: 10px; color: #fff; cursor: help;
}
.coverage-axis { display: flex; justify-content: space-between; font-size: 11px; color: #909399; margin-top: 4px; }
.cov-legend { display: flex; gap: 14px; font-size: 11.5px; color: #909399; }
.cov-legend span { display: flex; align-items: center; gap: 4px; }
.cov-legend i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }

.issue-panel { margin-top: 16px; border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; }
.issue-title { background: #f5f7fa; padding: 10px 14px; font-weight: 600; font-size: 13px; color: #606266; }
.issue-list { margin: 0; padding: 8px 0; list-style: none; max-height: 240px; overflow-y: auto; }
.issue-list li { padding: 5px 16px; font-size: 12.5px; display: flex; gap: 8px; align-items: flex-start; }
.issue-list li::before { content: ''; width: 6px; height: 6px; border-radius: 50%; flex: none; margin-top: 5px; }
.issue-list li.error::before { background: #f56c6c; }
.issue-list li.warning::before { background: #e6a23c; }
.issue-list li.error { color: #d93026; }
.issue-list li.warning { color: #b88230; }

.preview-box {
  background: #f8f9fb; border-radius: 6px; padding: 10px 12px; font-size: 12.5px;
  display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 4px;
}
.preview-seg { padding: 2px 8px; border-radius: 4px; }
.seg-work { background: #ecf5ff; color: #409eff; }
.seg-break { background: #fdf6ec; color: #e6a23c; }
.preview-total { color: #909399; }
</style>