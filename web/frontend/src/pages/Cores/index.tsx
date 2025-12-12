import { useEffect, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Select,
  Modal,
  Progress,
  message,
  Spin,
  Alert,
  Descriptions,
  Tooltip,
} from 'antd'
import {
  CloudServerOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { coreApi, type CoreInfo } from '@/api/core'

export default function Cores() {
  const [cores, setCores] = useState<CoreInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [xrayVersions, setXrayVersions] = useState<string[]>([])
  const [singboxVersions, setSingboxVersions] = useState<string[]>([])
  const [selectedXrayVersion, setSelectedXrayVersion] = useState<string>('')
  const [selectedSingboxVersion, setSelectedSingboxVersion] = useState<string>('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const fetchCores = async () => {
    setLoading(true)
    try {
      const res = await coreApi.list()
      if (res.success && res.obj) {
        setCores(res.obj)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchVersions = async () => {
    try {
      const [xrayRes, singboxRes] = await Promise.all([
        coreApi.getVersions('xray'),
        coreApi.getVersions('sing-box'),
      ])
      if (xrayRes.success && xrayRes.obj) {
        setXrayVersions(xrayRes.obj)
        if (xrayRes.obj.length > 0) {
          setSelectedXrayVersion(xrayRes.obj[0])
        }
      }
      if (singboxRes.success && singboxRes.obj) {
        setSingboxVersions(singboxRes.obj)
        if (singboxRes.obj.length > 0) {
          setSelectedSingboxVersion(singboxRes.obj[0])
        }
      }
    } catch (error) {
      message.error('获取版本列表失败')
    }
  }

  const handleDownload = async (coreType: string, version: string) => {
    if (!version) {
      message.warning('请选择版本')
      return
    }

    Modal.confirm({
      title: '确认下载',
      content: `确定要下载 ${coreType} ${version} 吗？下载过程可能需要几分钟。`,
      onOk: async () => {
        setDownloading(coreType)
        setDownloadProgress(0)

        // 模拟进度
        const progressInterval = setInterval(() => {
          setDownloadProgress((prev) => {
            if (prev >= 90) return prev
            return prev + Math.random() * 10
          })
        }, 500)

        try {
          const res = await coreApi.download(coreType, version)
          clearInterval(progressInterval)
          setDownloadProgress(100)

          if (res.success) {
            message.success(`${coreType} ${version} 下载成功！`)
            fetchCores()
          } else {
            message.error(res.msg || '下载失败')
          }
        } catch (error) {
          clearInterval(progressInterval)
          message.error('下载失败，请检查网络连接')
        } finally {
          setTimeout(() => {
            setDownloading(null)
            setDownloadProgress(0)
          }, 1000)
        }
      },
    })
  }

  const handleSwitchCore = async (coreType: string) => {
    try {
      const res = await coreApi.switch(coreType)
      if (res.success) {
        message.success(`已切换到 ${coreType}`)
        fetchCores()
      } else {
        message.error(res.msg || '切换失败')
      }
    } catch (error) {
      message.error('切换失败')
    }
  }

  const handleRestartCore = async () => {
    try {
      const res = await coreApi.restart()
      if (res.success) {
        message.success('核心重启中...')
        setTimeout(fetchCores, 2000)
      } else {
        message.error(res.msg || '重启失败')
      }
    } catch (error) {
      message.error('重启失败')
    }
  }

  const handleStopCore = async () => {
    try {
      const res = await coreApi.stop()
      if (res.success) {
        message.success('核心已停止')
        fetchCores()
      } else {
        message.error(res.msg || '停止失败')
      }
    } catch (error) {
      message.error('停止失败')
    }
  }

  const handleStartCore = async () => {
    try {
      const res = await coreApi.start()
      if (res.success) {
        message.success('核心启动中...')
        setTimeout(fetchCores, 2000)
      } else {
        message.error(res.msg || '启动失败')
      }
    } catch (error) {
      message.error('启动失败')
    }
  }

  useEffect(() => {
    fetchCores()
    fetchVersions()
  }, [])

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <CheckCircleOutlined className="text-green-500" />
      case 'error':
        return <CloseCircleOutlined className="text-red-500" />
      default:
        return <PauseCircleOutlined className="text-gray-400" />
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case 'running':
        return '运行中'
      case 'error':
        return '错误'
      default:
        return '已停止'
    }
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'success'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  const xrayCore = cores.find((c) => c.type === 'xray')
  const singboxCore = cores.find((c) => c.type === 'sing-box')

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">核心管理</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCores} loading={loading}>
            刷新状态
          </Button>
          <Button icon={<SyncOutlined />} onClick={fetchVersions}>
            刷新版本
          </Button>
        </Space>
      </div>

      {/* 提示信息 */}
      <Alert
        message="核心管理"
        description={
          <span>
            系统会根据当前服务器架构自动下载对应的二进制文件。
            <strong>Xray</strong> 支持 VMess、VLESS、Trojan、Shadowsocks 等协议；
            <strong>sing-box</strong> 额外支持 Hysteria2、TUIC 等新协议。
          </span>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
      />

      {/* 核心控制 */}
      <Card title="核心控制" className="shadow-sm">
        <Space size="large">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartCore}
            disabled={cores.some((c) => c.isActive && c.status.state === 'running')}
          >
            启动
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRestartCore}
            disabled={!cores.some((c) => c.isActive && c.status.state === 'running')}
          >
            重启
          </Button>
          <Button
            danger
            icon={<PauseCircleOutlined />}
            onClick={handleStopCore}
            disabled={!cores.some((c) => c.isActive && c.status.state === 'running')}
          >
            停止
          </Button>
        </Space>
      </Card>

      {/* 核心列表 */}
      <Row gutter={[16, 16]}>
        {/* Xray 核心 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center space-x-2">
                <CloudServerOutlined className="text-blue-500" />
                <span>Xray 核心</span>
                {xrayCore?.isActive && <Tag color="blue">当前使用</Tag>}
              </div>
            }
            className="shadow-sm h-full"
            extra={
              !xrayCore?.isActive && (
                <Button type="link" onClick={() => handleSwitchCore('xray')}>
                  切换到此核心
                </Button>
              )
            }
          >
            <Spin spinning={downloading === 'xray'}>
              {downloading === 'xray' && (
                <div className="mb-4">
                  <Progress percent={Math.round(downloadProgress)} status="active" />
                  <div className="text-center text-gray-500 text-sm">正在下载...</div>
                </div>
              )}

              <Descriptions column={1} size="small">
                <Descriptions.Item label="状态">
                  <Space>
                    {getStatusIcon(xrayCore?.status.state || 'stopped')}
                    <Tag color={getStatusColor(xrayCore?.status.state || 'stopped')}>
                      {getStatusText(xrayCore?.status.state || 'stopped')}
                    </Tag>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="当前版本">
                  {xrayCore?.version || '未安装'}
                </Descriptions.Item>
                {xrayCore?.status.errorMsg && (
                  <Descriptions.Item label="错误信息">
                    <Tooltip title={xrayCore.status.errorMsg}>
                      <span className="text-red-500 truncate block max-w-xs">
                        {xrayCore.status.errorMsg}
                      </span>
                    </Tooltip>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Select
                    className="flex-1"
                    placeholder="选择版本"
                    value={selectedXrayVersion}
                    onChange={setSelectedXrayVersion}
                    loading={xrayVersions.length === 0}
                    options={xrayVersions.map((v) => ({ label: v, value: v }))}
                  />
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload('xray', selectedXrayVersion)}
                    disabled={downloading !== null}
                  >
                    下载
                  </Button>
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  支持协议: VMess, VLESS, Trojan, Shadowsocks, Socks, HTTP
                </div>
              </div>
            </Spin>
          </Card>
        </Col>

        {/* sing-box 核心 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center space-x-2">
                <CloudServerOutlined className="text-purple-500" />
                <span>sing-box 核心</span>
                {singboxCore?.isActive && <Tag color="purple">当前使用</Tag>}
              </div>
            }
            className="shadow-sm h-full"
            extra={
              !singboxCore?.isActive && (
                <Button type="link" onClick={() => handleSwitchCore('sing-box')}>
                  切换到此核心
                </Button>
              )
            }
          >
            <Spin spinning={downloading === 'sing-box'}>
              {downloading === 'sing-box' && (
                <div className="mb-4">
                  <Progress percent={Math.round(downloadProgress)} status="active" />
                  <div className="text-center text-gray-500 text-sm">正在下载...</div>
                </div>
              )}

              <Descriptions column={1} size="small">
                <Descriptions.Item label="状态">
                  <Space>
                    {getStatusIcon(singboxCore?.status.state || 'stopped')}
                    <Tag color={getStatusColor(singboxCore?.status.state || 'stopped')}>
                      {getStatusText(singboxCore?.status.state || 'stopped')}
                    </Tag>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="当前版本">
                  {singboxCore?.version || '未安装'}
                </Descriptions.Item>
                {singboxCore?.status.errorMsg && (
                  <Descriptions.Item label="错误信息">
                    <Tooltip title={singboxCore.status.errorMsg}>
                      <span className="text-red-500 truncate block max-w-xs">
                        {singboxCore.status.errorMsg}
                      </span>
                    </Tooltip>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Select
                    className="flex-1"
                    placeholder="选择版本"
                    value={selectedSingboxVersion}
                    onChange={setSelectedSingboxVersion}
                    loading={singboxVersions.length === 0}
                    options={singboxVersions.map((v) => ({ label: v, value: v }))}
                  />
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload('sing-box', selectedSingboxVersion)}
                    disabled={downloading !== null}
                  >
                    下载
                  </Button>
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  支持协议: 上述全部 + Hysteria, Hysteria2, TUIC, Naive
                </div>
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* 系统信息 */}
      <Card title="系统信息" className="shadow-sm">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="操作系统">
            {typeof window !== 'undefined' ? '服务器端检测' : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="架构">
            自动检测 (amd64/arm64/arm)
          </Descriptions.Item>
          <Descriptions.Item label="下载源">
            GitHub Releases
          </Descriptions.Item>
        </Descriptions>
        <div className="mt-2 text-gray-400 text-sm">
          系统会根据服务器的操作系统和 CPU 架构自动选择正确的二进制文件进行下载。
        </div>
      </Card>
    </div>
  )
}
