import api from './index'
import type { ApiResponse } from '@/types/server'

export interface PanelSettings {
  webListen: string
  webPort: number
  webCertFile: string
  webKeyFile: string
  webBasePath: string
  sessionMaxAge: number
  expireDiff: number
  trafficDiff: number
  tgBotEnable: boolean
  tgBotToken: string
  tgBotChatId: string
  tgRunTime: string
  tgBotBackup: boolean
  xrayTemplateConfig: string
}

export const settingApi = {
  // 获取所有设置
  getAll: async (): Promise<ApiResponse<PanelSettings>> => {
    const response = await api.post('/xui/setting/all')
    return response.data
  },

  // 更新设置
  update: async (data: Partial<PanelSettings>): Promise<ApiResponse> => {
    const formData = new URLSearchParams()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })
    const response = await api.post('/xui/setting/update', formData)
    return response.data
  },

  // 获取默认 Xray 配置
  getDefaultXrayConfig: async (): Promise<ApiResponse<string>> => {
    const response = await api.post('/xui/setting/getDefaultJsonConfig')
    return response.data
  },

  // 重启面板
  restartPanel: async (): Promise<ApiResponse> => {
    const response = await api.post('/xui/setting/restartPanel')
    return response.data
  },
}
