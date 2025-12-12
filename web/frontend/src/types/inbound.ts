// 协议类型
export type Protocol = 
  | 'vmess' 
  | 'vless' 
  | 'trojan' 
  | 'shadowsocks' 
  | 'dokodemo-door' 
  | 'socks' 
  | 'http'
  | 'hysteria'
  | 'hysteria2'
  | 'tuic'
  | 'naive'

// 传输层类型
export type Network = 'tcp' | 'ws' | 'grpc' | 'kcp' | 'quic' | 'http'

// 安全类型
export type Security = 'none' | 'tls' | 'xtls' | 'reality'

// 入站配置
export interface Inbound {
  id: number
  userId: number
  up: number
  down: number
  total: number
  remark: string
  enable: boolean
  expiryTime: number
  listen: string
  port: number
  protocol: Protocol
  settings: string
  streamSettings: string
  sniffing: string
  tag: string
}

// 入站表单数据
export interface InboundFormData {
  remark: string
  enable: boolean
  expiryTime: number | null
  total: number
  listen: string
  port: number
  protocol: Protocol
  // 协议特定设置
  settings: Record<string, unknown>
  // 传输层设置
  network: Network
  security: Security
  streamSettings: Record<string, unknown>
}

// VMess 用户
export interface VMessUser {
  id: string
  alterId: number
  email: string
  security: string
}

// VLess 用户
export interface VLessUser {
  id: string
  flow: string
  email: string
}

// Trojan 用户
export interface TrojanUser {
  password: string
  email: string
}

// Shadowsocks 设置
export interface ShadowsocksSettings {
  method: string
  password: string
  network: string
}
