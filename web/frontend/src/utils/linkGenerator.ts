import type { Inbound } from '@/types/inbound'

interface ClientInfo {
  id?: string
  password?: string
  email?: string
  alterId?: number
  flow?: string
}

interface ParsedSettings {
  clients?: ClientInfo[]
  method?: string
  password?: string
}

interface ParsedStreamSettings {
  network?: string
  security?: string
  wsSettings?: {
    path?: string
    headers?: { Host?: string }
  }
  grpcSettings?: {
    serviceName?: string
  }
  tcpSettings?: {
    header?: { type?: string }
  }
  tlsSettings?: {
    serverName?: string
    alpn?: string[]
    fingerprint?: string
  }
  realitySettings?: {
    publicKey?: string
    shortId?: string
    serverName?: string
    fingerprint?: string
    spiderX?: string
  }
}

// 解析 JSON 字符串
function parseJSON<T>(str: string, defaultValue: T): T {
  try {
    return str ? JSON.parse(str) : defaultValue
  } catch {
    return defaultValue
  }
}

// Base64 编码
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

// 生成 VMess 链接
function generateVMessLink(
  inbound: Inbound,
  client: ClientInfo,
  stream: ParsedStreamSettings,
  host: string
): string {
  const vmessObj = {
    v: '2',
    ps: inbound.remark || `vmess-${inbound.port}`,
    add: host,
    port: inbound.port,
    id: client.id,
    aid: client.alterId || 0,
    scy: 'auto',
    net: stream.network || 'tcp',
    type: 'none',
    host: '',
    path: '',
    tls: stream.security === 'tls' ? 'tls' : '',
    sni: '',
    alpn: '',
    fp: '',
  }

  // WebSocket 设置
  if (stream.network === 'ws' && stream.wsSettings) {
    vmessObj.path = stream.wsSettings.path || '/'
    vmessObj.host = stream.wsSettings.headers?.Host || ''
  }

  // gRPC 设置
  if (stream.network === 'grpc' && stream.grpcSettings) {
    vmessObj.path = stream.grpcSettings.serviceName || ''
    vmessObj.type = 'gun'
  }

  // TLS 设置
  if (stream.security === 'tls' && stream.tlsSettings) {
    vmessObj.sni = stream.tlsSettings.serverName || ''
    vmessObj.alpn = stream.tlsSettings.alpn?.join(',') || ''
    vmessObj.fp = stream.tlsSettings.fingerprint || ''
  }

  return 'vmess://' + base64Encode(JSON.stringify(vmessObj))
}

// 生成 VLess 链接
function generateVLessLink(
  inbound: Inbound,
  client: ClientInfo,
  stream: ParsedStreamSettings,
  host: string
): string {
  const params = new URLSearchParams()
  
  params.set('type', stream.network || 'tcp')
  
  if (stream.security && stream.security !== 'none') {
    params.set('security', stream.security)
  }

  // 传输层设置
  if (stream.network === 'ws' && stream.wsSettings) {
    params.set('path', stream.wsSettings.path || '/')
    if (stream.wsSettings.headers?.Host) {
      params.set('host', stream.wsSettings.headers.Host)
    }
  }

  if (stream.network === 'grpc' && stream.grpcSettings) {
    params.set('serviceName', stream.grpcSettings.serviceName || '')
    params.set('mode', 'gun')
  }

  // TLS 设置
  if (stream.security === 'tls' && stream.tlsSettings) {
    if (stream.tlsSettings.serverName) {
      params.set('sni', stream.tlsSettings.serverName)
    }
    if (stream.tlsSettings.fingerprint) {
      params.set('fp', stream.tlsSettings.fingerprint)
    }
    if (stream.tlsSettings.alpn?.length) {
      params.set('alpn', stream.tlsSettings.alpn.join(','))
    }
  }

  // Reality 设置
  if (stream.security === 'reality' && stream.realitySettings) {
    params.set('security', 'reality')
    if (stream.realitySettings.publicKey) {
      params.set('pbk', stream.realitySettings.publicKey)
    }
    if (stream.realitySettings.shortId) {
      params.set('sid', stream.realitySettings.shortId)
    }
    if (stream.realitySettings.serverName) {
      params.set('sni', stream.realitySettings.serverName)
    }
    if (stream.realitySettings.fingerprint) {
      params.set('fp', stream.realitySettings.fingerprint)
    }
    if (stream.realitySettings.spiderX) {
      params.set('spx', stream.realitySettings.spiderX)
    }
  }

  // Flow
  if (client.flow) {
    params.set('flow', client.flow)
  }

  const remark = encodeURIComponent(inbound.remark || `vless-${inbound.port}`)
  return `vless://${client.id}@${host}:${inbound.port}?${params.toString()}#${remark}`
}

// 生成 Trojan 链接
function generateTrojanLink(
  inbound: Inbound,
  client: ClientInfo,
  stream: ParsedStreamSettings,
  host: string
): string {
  const params = new URLSearchParams()
  
  params.set('type', stream.network || 'tcp')
  
  if (stream.security && stream.security !== 'none') {
    params.set('security', stream.security)
  } else {
    params.set('security', 'tls')
  }

  // 传输层设置
  if (stream.network === 'ws' && stream.wsSettings) {
    params.set('path', stream.wsSettings.path || '/')
    if (stream.wsSettings.headers?.Host) {
      params.set('host', stream.wsSettings.headers.Host)
    }
  }

  if (stream.network === 'grpc' && stream.grpcSettings) {
    params.set('serviceName', stream.grpcSettings.serviceName || '')
    params.set('mode', 'gun')
  }

  // TLS 设置
  if (stream.tlsSettings) {
    if (stream.tlsSettings.serverName) {
      params.set('sni', stream.tlsSettings.serverName)
    }
    if (stream.tlsSettings.fingerprint) {
      params.set('fp', stream.tlsSettings.fingerprint)
    }
    if (stream.tlsSettings.alpn?.length) {
      params.set('alpn', stream.tlsSettings.alpn.join(','))
    }
  }

  const remark = encodeURIComponent(inbound.remark || `trojan-${inbound.port}`)
  return `trojan://${client.password}@${host}:${inbound.port}?${params.toString()}#${remark}`
}

// 生成 Shadowsocks 链接
function generateShadowsocksLink(
  inbound: Inbound,
  settings: ParsedSettings,
  host: string
): string {
  const method = settings.method || 'aes-256-gcm'
  const password = settings.password || ''
  const userInfo = base64Encode(`${method}:${password}`)
  const remark = encodeURIComponent(inbound.remark || `ss-${inbound.port}`)
  
  return `ss://${userInfo}@${host}:${inbound.port}#${remark}`
}

// 生成 Socks 链接
function generateSocksLink(
  inbound: Inbound,
  client: ClientInfo | undefined,
  host: string
): string {
  const remark = encodeURIComponent(inbound.remark || `socks-${inbound.port}`)
  if (client?.id && client?.password) {
    const userInfo = base64Encode(`${client.id}:${client.password}`)
    return `socks://${userInfo}@${host}:${inbound.port}#${remark}`
  }
  return `socks://${host}:${inbound.port}#${remark}`
}

// 生成 Hysteria2 链接
function generateHysteria2Link(
  inbound: Inbound,
  password: string,
  host: string
): string {
  const params = new URLSearchParams()
  const remark = encodeURIComponent(inbound.remark || `hy2-${inbound.port}`)
  
  // Hysteria2 默认需要 TLS
  params.set('insecure', '1')
  
  return `hysteria2://${password}@${host}:${inbound.port}?${params.toString()}#${remark}`
}

// 主函数：生成分享链接
export function generateShareLink(inbound: Inbound, host: string = 'YOUR_SERVER_IP'): string {
  const settings = parseJSON<ParsedSettings>(inbound.settings, {})
  const stream = parseJSON<ParsedStreamSettings>(inbound.streamSettings, {})
  const clients = settings.clients || []
  const client = clients.length > 0 ? clients[0] : undefined

  switch (inbound.protocol) {
    case 'vmess':
      if (client?.id) {
        return generateVMessLink(inbound, client, stream, host)
      }
      break
    
    case 'vless':
      if (client?.id) {
        return generateVLessLink(inbound, client, stream, host)
      }
      break
    
    case 'trojan':
      if (client?.password) {
        return generateTrojanLink(inbound, client, stream, host)
      }
      break
    
    case 'shadowsocks':
      if (settings.password) {
        return generateShadowsocksLink(inbound, settings, host)
      }
      break
    
    case 'socks':
      return generateSocksLink(inbound, client || {}, host)
    
    case 'hysteria2':
      const hy2Password = settings.password || client?.password || ''
      if (hy2Password) {
        return generateHysteria2Link(inbound, hy2Password, host)
      }
      break
    
    default:
      break
  }

  return `${inbound.protocol}://${host}:${inbound.port}`
}

// 生成所有客户端的链接
export function generateAllClientLinks(inbound: Inbound, host: string = 'YOUR_SERVER_IP'): string[] {
  const settings = parseJSON<ParsedSettings>(inbound.settings, {})
  const stream = parseJSON<ParsedStreamSettings>(inbound.streamSettings, {})
  const links: string[] = []

  if (settings.clients && settings.clients.length > 0) {
    for (const client of settings.clients) {
      switch (inbound.protocol) {
        case 'vmess':
          if (client.id) {
            links.push(generateVMessLink(inbound, client, stream, host))
          }
          break
        case 'vless':
          if (client.id) {
            links.push(generateVLessLink(inbound, client, stream, host))
          }
          break
        case 'trojan':
          if (client.password) {
            links.push(generateTrojanLink(inbound, client, stream, host))
          }
          break
        default:
          break
      }
    }
  } else {
    // 单用户协议
    links.push(generateShareLink(inbound, host))
  }

  return links
}

// 生成订阅内容 (Base64 编码的链接列表)
export function generateSubscription(inbounds: Inbound[], host: string = 'YOUR_SERVER_IP'): string {
  const links: string[] = []
  
  for (const inbound of inbounds) {
    if (inbound.enable) {
      links.push(...generateAllClientLinks(inbound, host))
    }
  }
  
  return base64Encode(links.join('\n'))
}
