import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  // 如果有环境变量就用环境变量，如果没有（本地开发）就退回 /api
  baseURL: import.meta.env.VITE_API_URL || '/api', 
  timeout: 20000
})

request.interceptors.response.use(
  res => {
    const body = res.data
    if (body && body.code === 200) return body.data
    ElMessage.error((body && body.message) || '请求失败')
    return Promise.reject(new Error((body && body.message) || 'error'))
  },
  err => {
    const msg = err.response?.data?.message || err.message || '网络错误'
    ElMessage.error(msg)
    return Promise.reject(err)
  }
)

export default request