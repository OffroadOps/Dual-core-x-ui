// 服务器状态
export interface ServerStatus {
  cpu: number
  mem: {
    current: number
    total: number
  }
  swap: {
    current: number
    total: number
  }
  disk: {
    current: number
    total: number
  }
  xray: {
    state: 'running' | 'stopped' | 'error'
    errorMsg: string
    version: string
  }
  uptime: number
  loads: number[]
  tcpCount: number
  udpCount: number
  netIO: {
    up: number
    down: number
  }
  netTraffic: {
    sent: number
    recv: number
  }
}

// API 响应
export interface ApiResponse<T = unknown> {
  success: boolean
  msg: string
  obj: T
}
