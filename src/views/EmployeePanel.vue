<template>
  <div>
    <div class="toolbar">
      <div class="hint">共 {{ store.employees.length }} 名员工 · 周最大工时用于限制每人最多可排天数</div>
      <el-button type="primary" size="small" @click="openAdd">+ 新增员工</el-button>
    </div>

    <el-table :data="store.employees" border size="small">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="position" label="岗位" width="120" />
      <el-table-column prop="phone" label="电话" width="160" />
      <el-table-column prop="maxHoursPerWeek" label="周最大工时" width="120">
        <template #default="{ row }">{{ row.maxHoursPerWeek }} h</template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑员工' : '新增员工'" width="420px">
      <el-form :model="form" label-width="90px" size="small">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="岗位"><el-input v-model="form.position" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="周最大工时">
          <el-input-number v-model="form.maxHoursPerWeek" :min="0" :max="168" :step="8" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { store, loadAll } from '@/store'
import { addEmployee, updateEmployee, deleteEmployee } from '@/api/scheduling'

export default {
  setup() {
    const dialogVisible = ref(false)
    const editing = ref(null)
    const form = reactive({ name: '', position: '', phone: '', maxHoursPerWeek: 40 })

    function openAdd() {
      editing.value = null
      Object.assign(form, { name: '', position: '', phone: '', maxHoursPerWeek: 40 })
      dialogVisible.value = true
    }
    function openEdit(row) {
      editing.value = row
      Object.assign(form, row)
      dialogVisible.value = true
    }
    async function onSubmit() {
      if (!form.name.trim()) { ElMessage.warning('请填写姓名'); return }
      if (editing.value) {
        await updateEmployee(editing.value.id, { ...form })
        ElMessage.success('已更新')
      } else {
        await addEmployee({ ...form })
        ElMessage.success('已新增')
      }
      dialogVisible.value = false
      await loadAll()
    }
    async function onDelete(row) {
      try {
        await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '提示', { type: 'warning' })
      } catch { return }
      await deleteEmployee(row.id)
      ElMessage.success('已删除')
      await loadAll()
    }

    return { store, dialogVisible, editing, form, openAdd, openEdit, onSubmit, onDelete }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.hint { font-size: 13px; color: #909399; }
</style>