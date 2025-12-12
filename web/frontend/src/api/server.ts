import api from './index'
import type { ApiResponse, ServerStatus } from '@/types/server'

export const serverApi = {
  // 获取服务器状态
  getStatus: async (): Promise<ApiResponse<ServerStatus>> => {
    const response = await api.post('/server/status')
    return response.data
  },

  // 获取 Xray 版本
  getXrayVersion: async (): Promise<ApiResponse<string>> => {
    const response = await api.post('/server/getXrayVersion')
    return response.data
  },

  // 停止 Xray
  stopXray: async (): Promise<ApiResponse> => {
    const response = await api.post('/server/stopXrayService')
    return response.data
  },

  // 重启 Xray
  restartXray: async (): Promise<ApiResponse> => {
    const response = await api.post('/server/restartXrayService')
    return response.data
  },
}
