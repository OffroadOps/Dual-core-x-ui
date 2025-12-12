import { Modal, Button, Space, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'

interface QRCodeModalProps {
  open: boolean
  content: string
  onClose: () => void
}

export default function QRCodeModal({ open, content, onClose }: QRCodeModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    message.success('链接已复制到剪贴板')
  }

  return (
    <Modal
      title="二维码"
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
    >
      <div className="flex flex-col items-center py-4">
        <div className="bg-white p-4 rounded-lg shadow-inner">
          <QRCodeSVG value={content} size={256} />
        </div>
        
        <div className="mt-4 w-full">
          <div className="bg-gray-100 p-3 rounded text-sm break-all max-h-24 overflow-auto">
            {content}
          </div>
        </div>

        <Space className="mt-4">
          <Button icon={<CopyOutlined />} onClick={handleCopy}>
            复制链接
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      </div>
    </Modal>
  )
}
