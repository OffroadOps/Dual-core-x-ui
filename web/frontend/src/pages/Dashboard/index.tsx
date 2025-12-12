import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Tag, Button, Space, Radio, message } from 'antd'
import {
  CloudServerOutlined,
  DesktopOutlined,
  HddOutlined,
  SwapOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { serverApi } from '@/api/server'
import { coreApi, type CoreInfo } from '@/api/core'
import type { ServerStatus } from '@/types/server'

// 格式化字节
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  const parts = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分钟`)
  
  return parts.join(' ') || '刚刚启动'
}

export default function Dashboard() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [cores, setCores] = useState<CoreInfo[]>([])
  const [activeCore, setActiveCore] = useState<string>('xray')
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const [statusRes, coresRes] = await Promise.all([
        serverApi.getStatus(),
        coreApi.list(),
      ])
      if (statusRes.success) {
        setStatus(statusRes.obj)
      }
      if (coresRes.success && coresRes.obj) {
        setCores(coresRes.obj)
        const active = coresRes.obj.find(c => c.isActive)
        if (active) {
          setActiveCore(active.type)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestartCore = async () => {
    await coreApi.restart()
    message.success('核心重启中...')
    fetchStatus()
  }

  const handleStopCore = async () => {
    await coreApi.stop()
    message.success('核心已停止')
    fetchStatus()
  }

  const handleSwitchCore = async (type: string) => {
    await coreApi.switch(type)
    message.success(`已切换到 ${type}`)
    fetchStatus()
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">系统状态</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchStatus}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 双核状态卡片 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">代理核心</h3>
          <Space>
            <Radio.Group 
              value={activeCore} 
              onChange={(e) => handleSwitchCore(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="xray">Xray</Radio.Button>
              <Radio.Button value="sing-box">sing-box</Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRestartCore}
            >
              重启
            </Button>
            <Button
              danger
              icon={<PauseCircleOutlined />}
              onClick={handleStopCore}
            >
              停止
            </Button>
          </Space>
        </div>
        
        <Row gutter={16}>
          {cores.map((core) => (
            <Col key={core.type} xs={24} sm={12}>
              <div className={`p-4 rounded-lg border-2 ${core.isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <CloudServerOutlined className={`text-3xl ${core.isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{core.name}</span>
                      {core.isActive && <Tag color="blue">当前</Tag>}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Tag color={core.status.state === 'running' ? 'success' : core.status.state === 'error' ? 'error' : 'default'}>
                        {core.status.state === 'running' ? '运行中' : core.status.state === 'error' ? '错误' : '已停止'}
                      </Tag>
                      <span className="text-gray-500 text-sm">v{core.version}</span>
                    </div>
                    {core.status.errorMsg && (
                      <div className="text-red-500 text-xs mt-1 truncate max-w-xs" title={core.status.errorMsg}>
                        {core.status.errorMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          ))}
          {cores.length === 0 && (
            <Col span={24}>
              <div className="text-center text-gray-500 py-4">
                <CloudServerOutlined className="text-4xl mb-2" />
                <div>正在加载核心状态...</div>
              </div>
            </Col>
          )}
        </Row>
        
        <div className="mt-4 text-sm text-gray-500">
          <ThunderboltOutlined className="mr-1" />
          提示: Hysteria2、TUIC 等协议需要使用 sing-box 核心
        </div>
      </Card>

      {/* 系统资源卡片 */}
      <Row gutter={[16, 16]}>
        {/* CPU */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span className="flex items-center">
                  <DesktopOutlined className="mr-2" /> CPU 使用率
                </span>
              }
              value={status?.cpu || 0}
              suffix="%"
              precision={1}
            />
            <Progress
              percent={status?.cpu || 0}
              showInfo={false}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              className="mt-2"
            />
          </Card>
        </Col>

        {/* 内存 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span className="flex items-center">
                  <HddOutlined className="mr-2" /> 内存使用
                </span>
              }
              value={formatBytes(status?.mem.current || 0)}
              suffix={`/ ${formatBytes(status?.mem.total || 0)}`}
            />
            <Progress
              percent={status?.mem.total ? (status.mem.current / status.mem.total) * 100 : 0}
              showInfo={false}
              strokeColor="#722ed1"
              className="mt-2"
            />
          </Card>
        </Col>

        {/* 磁盘 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span className="flex items-center">
                  <HddOutlined className="mr-2" /> 磁盘使用
                </span>
              }
              value={formatBytes(status?.disk.current || 0)}
              suffix={`/ ${formatBytes(status?.disk.total || 0)}`}
            />
            <Progress
              percent={status?.disk.total ? (status.disk.current / status.disk.total) * 100 : 0}
              showInfo={false}
              strokeColor="#fa8c16"
              className="mt-2"
            />
          </Card>
        </Col>

        {/* 网络 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <span className="flex items-center">
                  <SwapOutlined className="mr-2" /> 网络流量
                </span>
              }
              value={formatBytes(status?.netTraffic.sent || 0)}
              suffix={`↑ / ${formatBytes(status?.netTraffic.recv || 0)} ↓`}
            />
            <div className="mt-2 text-gray-500 text-sm">
              运行时间: {formatUptime(status?.uptime || 0)}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 连接统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="TCP 连接数"
              value={status?.tcpCount || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="UDP 连接数"
              value={status?.udpCount || 0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
