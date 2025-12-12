import { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Dropdown,
  Modal,
  message,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  QrcodeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  MoreOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import { inboundApi } from '@/api/inbound'
import type { Inbound } from '@/types/inbound'
import InboundModal from './InboundModal'
import QRCodeModal from './QRCodeModal'
import { formatBytes } from '@/utils/format'
import { generateShareLink, generateAllClientLinks } from '@/utils/linkGenerator'

// 获取服务器地址（实际应从设置获取）
const getServerHost = () => {
  return window.location.hostname || 'YOUR_SERVER_IP'
}

export default function Inbounds() {
  const [inbounds, setInbounds] = useState<Inbound[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingInbound, setEditingInbound] = useState<Inbound | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrContent, setQrContent] = useState('')

  const fetchInbounds = async () => {
    setLoading(true)
    try {
      const res = await inboundApi.list()
      if (res.success) {
        setInbounds(res.obj || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInbounds()
  }, [])

  const handleAdd = () => {
    setEditingInbound(null)
    setModalOpen(true)
  }

  const handleEdit = (record: Inbound) => {
    setEditingInbound(record)
    setModalOpen(true)
  }

  const handleDelete = (record: Inbound) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除入站 "${record.remark || record.id}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const res = await inboundApi.delete(record.id)
        if (res.success) {
          message.success('删除成功')
          fetchInbounds()
        }
      },
    })
  }

  const handleToggleEnable = async (record: Inbound, checked: boolean) => {
    const res = await inboundApi.update(record.id, { ...record, enable: checked })
    if (res.success) {
      message.success(checked ? '已启用' : '已禁用')
      fetchInbounds()
    }
  }

  const handleResetTraffic = async (record: Inbound) => {
    const res = await inboundApi.update(record.id, { ...record, up: 0, down: 0 })
    if (res.success) {
      message.success('流量已重置')
      fetchInbounds()
    }
  }

  const handleShowQRCode = (record: Inbound) => {
    const host = getServerHost()
    const links = generateAllClientLinks(record, host)
    if (links.length > 0) {
      setQrContent(links[0])
      setQrModalOpen(true)
    } else {
      message.warning('无法生成链接')
    }
  }

  const handleCopyLink = (record: Inbound) => {
    const host = getServerHost()
    const link = generateShareLink(record, host)
    navigator.clipboard.writeText(link)
    message.success('链接已复制')
  }

  const handleCopyAllLinks = (record: Inbound) => {
    const host = getServerHost()
    const links = generateAllClientLinks(record, host)
    if (links.length > 0) {
      navigator.clipboard.writeText(links.join('\n'))
      message.success(`已复制 ${links.length} 个链接`)
    } else {
      message.warning('无法生成链接')
    }
  }

  const getActionItems = (record: Inbound): MenuProps['items'] => [
    {
      key: 'qrcode',
      icon: <QrcodeOutlined />,
      label: '二维码',
      onClick: () => handleShowQRCode(record),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制链接',
      onClick: () => handleCopyLink(record),
    },
    {
      key: 'copyAll',
      icon: <CopyOutlined />,
      label: '复制所有链接',
      onClick: () => handleCopyAllLinks(record),
    },
    {
      key: 'reset',
      icon: <ReloadOutlined />,
      label: '重置流量',
      onClick: () => handleResetTraffic(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleDelete(record),
    },
  ]

  const columns: ColumnsType<Inbound> = [
    {
      title: '启用',
      dataIndex: 'enable',
      key: 'enable',
      width: 80,
      render: (enable: boolean, record) => (
        <Switch
          checked={enable}
          onChange={(checked) => handleToggleEnable(record, checked)}
        />
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 100,
      render: (protocol: string) => (
        <Tag color="blue">{protocol.toUpperCase()}</Tag>
      ),
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: '流量 ↑/↓',
      key: 'traffic',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="text-green-600">↑ {formatBytes(record.up)}</span>
          <span className="text-blue-600">↓ {formatBytes(record.down)}</span>
        </Space>
      ),
    },
    {
      title: '流量限制',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (total: number, record) => {
        if (total === 0) return <Tag color="green">无限制</Tag>
        const used = record.up + record.down
        const percent = (used / total) * 100
        return (
          <Tooltip title={`${formatBytes(used)} / ${formatBytes(total)}`}>
            <Tag color={percent > 90 ? 'red' : percent > 70 ? 'orange' : 'blue'}>
              {formatBytes(total)}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '到期时间',
      dataIndex: 'expiryTime',
      key: 'expiryTime',
      width: 120,
      render: (time: number) => {
        if (time === 0) return <Tag color="green">无限期</Tag>
        const isExpired = time < Date.now()
        return (
          <Tag color={isExpired ? 'red' : 'blue'}>
            {new Date(time).toLocaleDateString('zh-CN')}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
            <Button type="link" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  // 统计信息
  const totalUp = inbounds.reduce((sum, i) => sum + i.up, 0)
  const totalDown = inbounds.reduce((sum, i) => sum + i.down, 0)

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <Card>
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-gray-500">总上传/下载：</span>
            <Tag color="green">{formatBytes(totalUp)} / {formatBytes(totalDown)}</Tag>
          </div>
          <div>
            <span className="text-gray-500">总流量：</span>
            <Tag color="green">{formatBytes(totalUp + totalDown)}</Tag>
          </div>
          <div>
            <span className="text-gray-500">入站数量：</span>
            <Tag color="blue">{inbounds.length}</Tag>
          </div>
        </div>
      </Card>

      {/* 入站列表 */}
      <Card
        title="入站列表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchInbounds}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加入站
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={inbounds}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={false}
        />
      </Card>

      {/* 入站编辑弹窗 */}
      <InboundModal
        open={modalOpen}
        inbound={editingInbound}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          fetchInbounds()
        }}
      />

      {/* 二维码弹窗 */}
      <QRCodeModal
        open={qrModalOpen}
        content={qrContent}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  )
}
