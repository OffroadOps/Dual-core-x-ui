import api from './index'
import type { ApiResponse } from '@/types/server'

export interface LoginParams {
  username: string
  password: string
}

export const authApi = {
  // 登录
  login: async (params: LoginParams): Promise<ApiResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', params.username)
    formData.append('password', params.password)
    const response = await api.post('/login', formData)
    return response.data
  },

  // 登出
  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/logout')
    return response.data
  },
}
