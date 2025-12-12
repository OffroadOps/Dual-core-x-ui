import { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Tabs,
  message,
  Divider,
  Space,
} from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { settingApi } from '@/api/setting'

export default function Settings() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await settingApi.getAll()
      if (res.success) {
        form.setFieldsValue(res.obj)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const values = await form.validateFields()
      const res = await settingApi.update(values)
      if (res.success) {
        message.success('设置已保存')
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRestartPanel = async () => {
    const res = await settingApi.restartPanel()
    if (res.success) {
      message.success('面板正在重启...')
    }
  }

  const tabItems = [
    {
      key: 'panel',
      label: '面板设置',
      children: (
        <div className="max-w-xl">
          <Form.Item
            label="面板监听 IP"
            name="webListen"
            tooltip="留空表示监听所有 IP"
          >
            <Input placeholder="例如: 0.0.0.0" />
          </Form.Item>

          <Form.Item
            label="面板端口"
            name="webPort"
            rules={[{ required: true, message: '请输入端口' }]}
          >
            <InputNumber min={1} max={65535} className="w-full" />
          </Form.Item>

          <Form.Item
            label="面板根路径"
            name="webBasePath"
            tooltip="用于反向代理，例如: /xui/"
          >
            <Input placeholder="/" />
          </Form.Item>

          <Form.Item
            label="证书公钥文件路径"
            name="webCertFile"
            tooltip="用于 HTTPS"
          >
            <Input placeholder="/path/to/cert.pem" />
          </Form.Item>

          <Form.Item
            label="证书私钥文件路径"
            name="webKeyFile"
            tooltip="用于 HTTPS"
          >
            <Input placeholder="/path/to/key.pem" />
          </Form.Item>

          <Form.Item
            label="会话有效期 (天)"
            name="sessionMaxAge"
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Divider />

          <Form.Item
            label="到期提醒天数"
            name="expireDiff"
            tooltip="节点到期前多少天开始提醒"
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <Form.Item
            label="流量提醒阈值 (GB)"
            name="trafficDiff"
            tooltip="剩余流量低于多少 GB 时提醒"
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'telegram',
      label: 'Telegram Bot',
      children: (
        <div className="max-w-xl">
          <Form.Item
            label="启用 Telegram Bot"
            name="tgBotEnable"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Bot Token"
            name="tgBotToken"
            tooltip="从 @BotFather 获取"
          >
            <Input.Password placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
          </Form.Item>

          <Form.Item
            label="管理员 Chat ID"
            name="tgBotChatId"
            tooltip="从 @userinfobot 获取"
          >
            <Input placeholder="123456789" />
          </Form.Item>

          <Form.Item
            label="通知时间"
            name="tgRunTime"
            tooltip="每天发送通知的时间，格式: @daily 或 cron 表达式"
          >
            <Input placeholder="@daily" />
          </Form.Item>

          <Form.Item
            label="启用备份"
            name="tgBotBackup"
            valuePropName="checked"
            tooltip="定时将数据库备份发送到 Telegram"
          >
            <Switch />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'xray',
      label: 'Xray 配置',
      children: (
        <div>
          <Form.Item
            label="Xray 配置模板"
            name="xrayTemplateConfig"
            tooltip="JSON 格式的 Xray 配置模板"
          >
            <Input.TextArea
              rows={20}
              className="font-mono text-sm"
              placeholder='{"log": {...}, "api": {...}, ...}'
            />
          </Form.Item>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card
        title="面板设置"
        loading={loading}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSettings}>
              重置
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
            >
              保存设置
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Tabs items={tabItems} />
        </Form>

        <Divider />

        <div className="flex justify-end">
          <Button danger onClick={handleRestartPanel}>
            重启面板
          </Button>
        </div>
      </Card>
    </div>
  )
}
