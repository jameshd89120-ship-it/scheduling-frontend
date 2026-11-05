<template>
  <div>
    <header class="app-header">
      <div class="brand">
        <span style="font-size:20px">📅</span>
        <span>排班管理系统</span>
        <el-tag size="small" type="info" effect="plain">
          {{ store.settings.openTime }} ~ {{ store.settings.closeTime }}
        </el-tag>
      </div>
      <div class="week-picker">
        <el-button size="small" circle @click="onChangeWeek(-1)">‹</el-button>
        <span class="week-text">{{ weekRangeText }}</span>
        <el-button size="small" circle @click="onChangeWeek(1)">›</el-button>
      </div>
    </header>

    <main class="app-main">
      <div class="panel" v-loading="store.loading">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="排班表" name="schedule">
            <schedule-panel />
          </el-tab-pane>
          <el-tab-pane label="可用时间" name="availability">
            <availability-panel />
          </el-tab-pane>
          <el-tab-pane label="员工信息" name="employee">
            <employee-panel />
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { store, loadAll, changeWeek } from '@/store'
import SchedulePanel from '@/views/SchedulePanel.vue'
import AvailabilityPanel from '@/views/AvailabilityPanel.vue'
import EmployeePanel from '@/views/EmployeePanel.vue'

export default {
  components: { SchedulePanel, AvailabilityPanel, EmployeePanel },
  setup() {
    const activeTab = ref('schedule')

    const weekRangeText = computed(() => {
      const s = new Date(store.weekStart + 'T00:00:00')
      const e = new Date(s)
      e.setDate(s.getDate() + 6)
      const f = d => `${d.getMonth() + 1}月${d.getDate()}日`
      return `${s.getFullYear()}年 ${f(s)} - ${f(e)}`
    })

    async function onChangeWeek(delta) {
      await changeWeek(delta)
    }

       onMounted(() => {
      // 🚨 稍微延迟一下，避免 Vite 代理或后端刚启动未响应
      setTimeout(() => {
        loadAll()
      }, 100)
    })

    return { store, activeTab, weekRangeText, onChangeWeek }
  }
}
</script>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #f0f2f5;
  color: #303133;
}
.app-header {
  background: #fff; border-bottom: 1px solid #e4e7ed; padding: 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.brand { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; color: #409eff; }
.week-picker { display: flex; align-items: center; gap: 10px; }
.week-text { font-size: 13px; color: #606266; min-width: 180px; text-align: center; }
.app-main { padding: 16px; }
.panel { background: #fff; border-radius: 8px; padding: 16px; }
</style>