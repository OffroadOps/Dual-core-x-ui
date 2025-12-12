import { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Tabs,
  Button,
  Space,
  Divider,
  Row,
  Col,
  message,
} from 'antd'
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { inboundApi } from '@/api/inbound'
import type { Inbound, Protocol } from '@/types/inbound'
import { generateUUID, randomPort } from '@/utils/format'

interface InboundModalProps {
  open: boolean
  inbound: Inbound | null
  onClose: () => void
  onSuccess: () => void
}

const protocols: { value: Protocol; label: string; description?: string }[] = [
  { value: 'vmess', label: 'VMess', description: 'V2Ray 主流协议' },
  { value: 'vless', label: 'VLESS', description: '轻量级协议，推荐' },
  { value: 'trojan', label: 'Trojan', description: '伪装 HTTPS 流量' },
  { value: 'shadowsocks', label: 'Shadowsocks', description: '经典代理协议' },
  { value: 'socks', label: 'Socks', description: 'Socks5 代理' },
  { value: 'http', label: 'HTTP', description: 'HTTP 代理' },
  { value: 'hysteria2', label: 'Hysteria2', description: 'QUIC 高速协议' },
]

const networks = [
  { value: 'tcp', label: 'TCP' },
  { value: 'ws', label: 'WebSocket' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'kcp', label: 'mKCP' },
  { value: 'quic', label: 'QUIC' },
  { value: 'httpupgrade', label: 'HTTPUpgrade' },
]

const securities = [
  { value: 'none', label: '无' },
  { value: 'tls', label: 'TLS' },
  { value: 'reality', label: 'Reality' },
]

const ssEncryptions = [
  { value: 'aes-256-gcm', label: 'aes-256-gcm' },
  { value: 'aes-128-gcm', label: 'aes-128-gcm' },
  { value: 'chacha20-poly1305', label: 'chacha20-poly1305' },
  { value: '2022-blake3-aes-256-gcm', label: '2022-blake3-aes-256-gcm' },
  { value: '2022-blake3-chacha20-poly1305', label: '2022-blake3-chacha20-poly1305' },
]

const vlessFlows = [
  { value: '', label: '无' },
  { value: 'xtls-rprx-vision', label: 'xtls-rprx-vision' },
]

const fingerprints = [
  { value: '', label: '无' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'safari', label: 'Safari' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'edge', label: 'Edge' },
  { value: 'random', label: '随机' },
  { value: 'randomized', label: '完全随机' },
]

export default function InboundModal({
  open,
  inbound,
  onClose,
  onSuccess,
}: InboundModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const isEdit = !!inbound

  const protocol = Form.useWatch('protocol', form)
  const network = Form.useWatch('network', form)
  const security = Form.useWatch('security', form)

  useEffect(() => {
    if (open) {
      if (inbound) {
        // 编辑模式：解析现有配置
        const settings = inbound.settings ? JSON.parse(inbound.settings) : {}
        const streamSettings = inbound.streamSettings ? JSON.parse(inbound.streamSettings) : {}
        
        form.setFieldsValue({
          remark: inbound.remark,
          enable: inbound.enable,
          protocol: inbound.protocol,
          listen: inbound.listen,
          port: inbound.port,
          expiryTime: inbound.expiryTime ? dayjs(inbound.expiryTime) : null,
          totalGB: inbound.total ? inbound.total / (1024 * 1024 * 1024) : 0,
          // 协议设置
          clients: settings.clients || [],
          ssMethod: settings.method,
          ssPassword: settings.password,
          // 传输设置
          network: streamSettings.network || 'tcp',
          security: streamSettings.security || 'none',
          wsPath: streamSettings.wsSettings?.path,
          wsHost: streamSettings.wsSettings?.headers?.Host,
          grpcServiceName: streamSettings.grpcSettings?.serviceName,
          // TLS 设置
          tlsServerName: streamSettings.tlsSettings?.serverName,
          tlsFingerprint: streamSettings.tlsSettings?.fingerprint,
          // Reality 设置
          realityDest: streamSettings.realitySettings?.dest,
          realityServerNames: streamSettings.realitySettings?.serverNames?.join(','),
          realityPrivateKey: streamSettings.realitySettings?.privateKey,
          realityPublicKey: streamSettings.realitySettings?.publicKey,
          realityShortIds: streamSettings.realitySettings?.shortIds?.join(','),
        })
      } else {
        // 新建模式：设置默认值
        form.resetFields()
        form.setFieldsValue({
          enable: true,
          protocol: 'vless',
          port: randomPort(),
          network: 'tcp',
          security: 'none',
          clients: [{ id: generateUUID(), email: '', flow: '' }],
        })
      }
    }
  }, [open, inbound, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // 构建协议设置
      let settings: Record<string, unknown> = {}
      
      switch (values.protocol) {
        case 'vmess':
          settings = {
            clients: (values.clients || []).map((c: { id: string; email?: string; alterId?: number }) => ({
              id: c.id,
              email: c.email || `user-${c.id.substring(0, 8)}`,
              alterId: c.alterId || 0,
            })),
          }
          break
        case 'vless':
          settings = {
            clients: (values.clients || []).map((c: { id: string; email?: string; flow?: string }) => ({
              id: c.id,
              email: c.email || `user-${c.id.substring(0, 8)}`,
              flow: c.flow || '',
            })),
            decryption: 'none',
          }
          break
        case 'trojan':
          settings = {
            clients: (values.clients || []).map((c: { password?: string; email?: string }) => ({
              password: c.password || generateUUID(),
              email: c.email || '',
            })),
          }
          break
        case 'shadowsocks':
          settings = {
            method: values.ssMethod || 'aes-256-gcm',
            password: values.ssPassword || generateUUID(),
            network: 'tcp,udp',
          }
          break
        case 'socks':
        case 'http':
          settings = {
            auth: 'noauth',
          }
          break
        case 'hysteria2':
          settings = {
            users: (values.clients || []).map((c: { password?: string; email?: string }) => ({
              password: c.password || generateUUID(),
            })),
          }
          break
      }

      // 构建传输层设置
      const streamSettings: Record<string, unknown> = {
        network: values.network || 'tcp',
        security: values.security || 'none',
      }

      // WebSocket 设置
      if (values.network === 'ws') {
        streamSettings.wsSettings = {
          path: values.wsPath || '/',
          headers: values.wsHost ? { Host: values.wsHost } : {},
        }
      }

      // gRPC 设置
      if (values.network === 'grpc') {
        streamSettings.grpcSettings = {
          serviceName: values.grpcServiceName || '',
        }
      }

      // TLS 设置
      if (values.security === 'tls') {
        streamSettings.tlsSettings = {
          serverName: values.tlsServerName || '',
          fingerprint: values.tlsFingerprint || 'chrome',
          certificates: [],
        }
      }

      // Reality 设置
      if (values.security === 'reality') {
        streamSettings.realitySettings = {
          show: false,
          dest: values.realityDest || '',
          xver: 0,
          serverNames: values.realityServerNames?.split(',').map((s: string) => s.trim()) || [],
          privateKey: values.realityPrivateKey || '',
          shortIds: values.realityShortIds?.split(',').map((s: string) => s.trim()) || [''],
        }
      }

      const data: Partial<Inbound> = {
        remark: values.remark,
        enable: values.enable,
        listen: values.listen || '',
        port: values.port,
        protocol: values.protocol,
        expiryTime: values.expiryTime ? values.expiryTime.valueOf() : 0,
        total: (values.totalGB || 0) * 1024 * 1024 * 1024,
        settings: JSON.stringify(settings),
        streamSettings: JSON.stringify(streamSettings),
        sniffing: JSON.stringify({ enabled: true, destOverride: ['http', 'tls', 'quic', 'fakedns'] }),
      }

      if (isEdit && inbound) {
        await inboundApi.update(inbound.id, data)
        message.success('更新成功')
      } else {
        await inboundApi.add(data)
        message.success('添加成功')
      }

      onSuccess()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 渲染客户端列表（VMess/VLess/Trojan）
  const renderClientList = () => {
    const isTrojan = protocol === 'trojan'
    const isVLess = protocol === 'vless'

    return (
      <Form.List name="clients">
        {(fields, { add, remove }) => (
          <div className="space-y-3">
            {fields.map(({ key, name, ...restField }) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <Row gutter={12} align="middle">
                  <Col span={isTrojan ? 10 : 8}>
                    <Form.Item
                      {...restField}
                      name={[name, isTrojan ? 'password' : 'id']}
                      label={isTrojan ? '密码' : 'UUID'}
                      rules={[{ required: true, message: '必填' }]}
                      className="mb-0"
                    >
                      <Input placeholder={isTrojan ? '密码' : 'UUID'} />
                    </Form.Item>
                  </Col>
                  <Col span={isTrojan ? 8 : 6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'email']}
                      label="备注"
                      className="mb-0"
                    >
                      <Input placeholder="用户备注" />
                    </Form.Item>
                  </Col>
                  {isVLess && (
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'flow']}
                        label="Flow"
                        className="mb-0"
                      >
                        <Select options={vlessFlows} placeholder="Flow" />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={4} className="flex items-end gap-1">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        const newId = isTrojan ? generateUUID().replace(/-/g, '') : generateUUID()
                        const clients = form.getFieldValue('clients') || []
                        clients[name] = { ...clients[name], [isTrojan ? 'password' : 'id']: newId }
                        form.setFieldsValue({ clients })
                      }}
                    />
                    {fields.length > 1 && (
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                    )}
                  </Col>
                </Row>
              </div>
            ))}
            <Button
              type="dashed"
              onClick={() => add({
                [isTrojan ? 'password' : 'id']: isTrojan ? generateUUID().replace(/-/g, '') : generateUUID(),
                email: '',
                flow: '',
              })}
              icon={<PlusOutlined />}
              block
            >
              添加用户
            </Button>
          </div>
        )}
      </Form.List>
    )
  }

  // 渲染协议特定设置
  const renderProtocolSettings = () => {
    switch (protocol) {
      case 'vmess':
      case 'vless':
      case 'trojan':
        return renderClientList()
      
      case 'shadowsocks':
        return (
          <Space direction="vertical" className="w-full">
            <Form.Item label="加密方式" name="ssMethod" rules={[{ required: true }]}>
              <Select options={ssEncryptions} />
            </Form.Item>
            <Form.Item label="密码" name="ssPassword" rules={[{ required: true }]}>
              <Input.Password placeholder="Shadowsocks 密码" />
            </Form.Item>
          </Space>
        )
      
      case 'hysteria2':
        return (
          <Form.List name="clients">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={12} align="middle">
                    <Col span={18}>
                      <Form.Item
                        {...restField}
                        name={[name, 'password']}
                        label="密码"
                        rules={[{ required: true }]}
                        className="mb-0"
                      >
                        <Input.Password placeholder="用户密码" />
                      </Form.Item>
                    </Col>
                    <Col span={6} className="flex items-end gap-1">
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const clients = form.getFieldValue('clients') || []
                          clients[name] = { password: generateUUID().replace(/-/g, '') }
                          form.setFieldsValue({ clients })
                        }}
                      />
                      {fields.length > 1 && (
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      )}
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ password: generateUUID().replace(/-/g, '') })}
                  icon={<PlusOutlined />}
                  block
                >
                  添加用户
                </Button>
              </div>
            )}
          </Form.List>
        )
      
      default:
        return <div className="text-gray-500">此协议无需额外配置</div>
    }
  }

  // 渲染传输层设置
  const renderTransportSettings = () => {
    return (
      <>
        {network === 'ws' && (
          <>
            <Form.Item label="WebSocket 路径" name="wsPath">
              <Input placeholder="/" />
            </Form.Item>
            <Form.Item label="Host" name="wsHost">
              <Input placeholder="example.com" />
            </Form.Item>
          </>
        )}

        {network === 'grpc' && (
          <Form.Item label="gRPC 服务名" name="grpcServiceName">
            <Input placeholder="grpc-service" />
          </Form.Item>
        )}
      </>
    )
  }

  // 渲染安全设置
  const renderSecuritySettings = () => {
    return (
      <>
        {security === 'tls' && (
          <>
            <Form.Item label="SNI (服务器名称)" name="tlsServerName">
              <Input placeholder="example.com" />
            </Form.Item>
            <Form.Item label="指纹" name="tlsFingerprint">
              <Select options={fingerprints} />
            </Form.Item>
          </>
        )}

        {security === 'reality' && (
          <>
            <Form.Item label="目标地址 (Dest)" name="realityDest" rules={[{ required: true }]}>
              <Input placeholder="example.com:443" />
            </Form.Item>
            <Form.Item label="Server Names" name="realityServerNames" rules={[{ required: true }]}>
              <Input placeholder="example.com,www.example.com" />
            </Form.Item>
            <Form.Item label="Private Key" name="realityPrivateKey" rules={[{ required: true }]}>
              <Input.Password placeholder="Reality 私钥" />
            </Form.Item>
            <Form.Item label="Public Key (客户端用)" name="realityPublicKey">
              <Input placeholder="Reality 公钥" />
            </Form.Item>
            <Form.Item label="Short IDs" name="realityShortIds">
              <Input placeholder="留空或输入短 ID，逗号分隔" />
            </Form.Item>
            <Form.Item label="指纹" name="tlsFingerprint">
              <Select options={fingerprints} defaultValue="chrome" />
            </Form.Item>
          </>
        )}
      </>
    )
  }

  const tabItems = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="备注名称"
                name="remark"
                rules={[{ required: true, message: '请输入备注' }]}
              >
                <Input placeholder="入站备注名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="启用" name="enable" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="协议"
                name="protocol"
                rules={[{ required: true, message: '请选择协议' }]}
              >
                <Select
                  options={protocols}
                  optionRender={(option) => (
                    <div>
                      <div className="font-medium">{option.data.label}</div>
                      {option.data.description && (
                        <div className="text-xs text-gray-400">{option.data.description}</div>
                      )}
                    </div>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <InputNumber min={1} max={65535} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="监听地址" name="listen">
            <Input placeholder="留空表示监听所有地址 (0.0.0.0)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="到期时间" name="expiryTime">
                <DatePicker className="w-full" placeholder="留空表示永不过期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="流量限制 (GB)" name="totalGB">
                <InputNumber min={0} className="w-full" placeholder="0 表示不限制" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'protocol',
      label: '协议设置',
      children: (
        <div className="space-y-4">
          <div className="text-sm text-gray-500 mb-4">
            配置 {protocol?.toUpperCase() || ''} 协议的用户和参数
          </div>
          {renderProtocolSettings()}
        </div>
      ),
    },
    {
      key: 'transport',
      label: '传输配置',
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="传输协议" name="network">
                <Select options={networks} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="安全性" name="security">
                <Select options={securities} />
              </Form.Item>
            </Col>
          </Row>

          <Divider className="my-2" />

          {renderTransportSettings()}
          {renderSecuritySettings()}
        </div>
      ),
    },
  ]

  return (
    <Modal
      title={isEdit ? '编辑入站' : '添加入站'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      width={700}
      okText={isEdit ? '保存' : '添加'}
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={{
          enable: true,
          protocol: 'vless',
          network: 'tcp',
          security: 'none',
        }}
      >
        <Tabs items={tabItems} />
      </Form>
    </Modal>
  )
}
