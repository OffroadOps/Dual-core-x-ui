import axios, { AxiosError } from 'axios'
import { message } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ApiResponse } from '@/types/server'

// 创建 axios 实例
const api = axios.create({
  baseURL: '',
  timeout: 30000,
  withCredentials: true, // 跨域请求携带 cookie
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse
    if (!data.success) {
      message.error(data.msg || '请求失败')
    }
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else {
      message.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default api
