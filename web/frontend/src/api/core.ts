import api from './index'
import type { ApiResponse } from '@/types/server'

export interface CoreStatus {
  state: 'running' | 'stopped' | 'error'
  version: string
  errorMsg: string
  uptime?: number
}

export interface CoreInfo {
  type: string
  name: string
  version: string
  isActive: boolean
  status: CoreStatus
}

export interface CoreStatusResponse {
  active: string
  status: Record<string, CoreStatus>
}

export const coreApi = {
  // 获取所有核心状态
  getStatus: async (): Promise<ApiResponse<CoreStatusResponse>> => {
    const response = await api.get('/core/status')
    return response.data
  },

  // 获取核心列表
  list: async (): Promise<ApiResponse<CoreInfo[]>> => {
    const response = await api.get('/core/list')
    return response.data
  },

  // 切换活动核心
  switch: async (type: string): Promise<ApiResponse> => {
    const response = await api.post('/core/switch', JSON.stringify({ type }), {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  },

  // 启动核心
  start: async (): Promise<ApiResponse> => {
    const response = await api.post('/core/start')
    return response.data
  },

  // 停止核心
  stop: async (): Promise<ApiResponse> => {
    const response = await api.post('/core/stop')
    return response.data
  },

  // 重启核心
  restart: async (): Promise<ApiResponse> => {
    const response = await api.post('/core/restart')
    return response.data
  },

  // 获取核心版本列表
  getVersions: async (type: string): Promise<ApiResponse<string[]>> => {
    const response = await api.get(`/core/versions/${type}`)
    return response.data
  },

  // 下载核心
  download: async (type: string, version: string): Promise<ApiResponse> => {
    const response = await api.post('/core/download', JSON.stringify({ type, version }), {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  },
}
