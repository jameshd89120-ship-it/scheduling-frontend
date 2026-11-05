import request from '@/utils/request'

/* 员工 */
export const listEmployees = () => request.get('/employees')
export const addEmployee = (data) => request.post('/employees', data)
export const updateEmployee = (id, data) => request.put(`/employees/${id}`, data)
export const deleteEmployee = (id) => request.delete(`/employees/${id}`)

/* 可用时间 */
export const getAvailability = (weekStart) =>
  request.get('/availability', { params: { weekStart } })

export const saveAvailability = (weekStart, cells) =>
  request.post('/availability/batch', cells, { params: { weekStart } })

/* 排班 */
export const getSchedule = (weekStart) =>
  request.get('/schedule', { params: { weekStart } })

export const generateScheduleApi = (weekStart, settings) =>
  request.post('/schedule/generate', { weekStart, settings })

export const updateCellApi = (payload) => request.put('/schedule/cell', payload)

export const clearScheduleApi = (weekStart) =>
  request.delete('/schedule', { params: { weekStart } })

export const validateScheduleApi = (weekStart, settings) =>
  request.get('/schedule/validate', { params: { weekStart, ...settings } })