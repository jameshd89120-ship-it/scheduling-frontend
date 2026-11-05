<template>
  <div>
    <div class="toolbar">
      <div class="hint">勾选员工本周可上班的日期，自动排班只从可用的人里挑选</div>
      <div class="tool-right">
        <el-button size="small" @click="setAll(true)">全部可用</el-button>
        <el-button size="small" @click="setAll(false)">全部不可用</el-button>
        <el-button size="small" @click="setWorkday">仅工作日</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="onSave">保存</el-button>
      </div>
    </div>

    <table class="avail-grid">
      <thead>
        <tr>
          <th class="name-cell">员工</th>
          <th v-for="(label, i) in DAY_LABELS" :key="i">{{ label }}</th>
          <th style="width:90px">可用天数</th>
          <th style="width:100px">最多可排</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in store.employees" :key="e.id">
          <td class="name-cell">{{ e.name }}</td>
          <td v-for="dayKey in DAY_KEYS" :key="dayKey">
            <!-- 🚨 核心修复：不用 v-model，改为手动赋值 -->
            <el-checkbox 
              :model-value="!!store.availability[e.id]?.[dayKey]" 
              @update:model-value="(val) => setAvail(e.id, dayKey, val)" 
            />
          </td>
          <td class="count">{{ availCount(e.id) }} 天</td>
          <td class="count">{{ maxDays(e) }} 天</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { store } from '@/store'
import { DAY_KEYS, DAY_LABELS, dayKeyToDayOfWeek } from '@/utils/date'
import { saveAvailability } from '@/api/scheduling'

export default {
  setup() {
    const saving = ref(false)

    // 🚨 新增手动赋值方法，防止 store 里没有该员工的对象时报错
    function setAvail(empId, dayKey, val) {
      if (!store.availability[empId]) {
        store.availability[empId] = {}
      }
      store.availability[empId][dayKey] = val
    }

    function availCount(id) {
      return DAY_KEYS.filter(k => store.availability[id]?.[k]).length
    }
    function maxDays(e) {
      const S = store.settings
      if (e.maxHoursPerWeek > 0 && S.workHours > 0) {
        return Math.min(S.maxDaysPerWeek, Math.floor(e.maxHoursPerWeek / S.workHours))
      }
      return S.maxDaysPerWeek
    }
    function setAll(v) {
      store.employees.forEach(e => {
        if(!store.availability[e.id]) store.availability[e.id] = {}
        DAY_KEYS.forEach(k => { store.availability[e.id][k] = v })
      })
    }
    function setWorkday() {
      store.employees.forEach(e => {
        if(!store.availability[e.id]) store.availability[e.id] = {}
        DAY_KEYS.forEach((k, i) => { store.availability[e.id][k] = i < 5 })
      })
    }

    async function onSave() {
      const cells = []
      store.employees.forEach(e => {
        DAY_KEYS.forEach(k => {
          cells.push({
            employeeId: e.id,
            dayOfWeek: dayKeyToDayOfWeek(k),
            available: !!store.availability[e.id]?.[k]
          })
        })
      })
      saving.value = true
      try {
        await saveAvailability(store.weekStart, cells)
        ElMessage.success('可用时间已保存')
      } catch (error) {
        console.error(error)
      } finally {
        saving.value = false
      }
    }

    return { 
      store, DAY_KEYS, DAY_LABELS, saving, 
      availCount, maxDays, setAvail, setAll, setWorkday, onSave 
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.tool-right { display: flex; gap: 10px; flex-wrap: wrap; }
.hint { font-size: 13px; color: #909399; }

.avail-grid { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.avail-grid th, .avail-grid td {
  border-bottom: 1px solid #ebeef5; border-right: 1px solid #ebeef5; padding: 8px; text-align: center;
}
.avail-grid thead th { background: #f5f7fa; color: #606266; font-weight: 600; }
.avail-grid .name-cell { text-align: left; font-weight: 600; padding-left: 14px; }
.avail-grid .count { color: #409eff; font-weight: 600; }
</style>