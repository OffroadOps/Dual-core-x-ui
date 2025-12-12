import api from './index'
import type { ApiResponse } from '@/types/server'
import type { Inbound } from '@/types/inbound'

export const inboundApi = {
  // 获取入站列表
  list: async (): Promise<ApiResponse<Inbound[]>> => {
    const response = await api.post('/xui/inbound/list')
    return response.data
  },

  // 添加入站
  add: async (data: Partial<Inbound>): Promise<ApiResponse<Inbound>> => {
    const formData = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    const response = await api.post('/xui/inbound/add', formData)
    return response.data
  },

  // 更新入站
  update: async (id: number, data: Partial<Inbound>): Promise<ApiResponse<Inbound>> => {
    const formData = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
    const response = await api.post(`/xui/inbound/update/${id}`, formData)
    return response.data
  },

  // 删除入站
  delete: async (id: number): Promise<ApiResponse> => {
    const response = await api.post(`/xui/inbound/del/${id}`)
    return response.data
  },

  // 重置流量
  resetTraffic: async (id: number): Promise<ApiResponse> => {
    const response = await api.post(`/xui/inbound/resetTraffic/${id}`)
    return response.data
  },
}
