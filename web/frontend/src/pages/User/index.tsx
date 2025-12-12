import { useState } from 'react'
import { Card, Form, Input, Button, message, Divider, Alert } from 'antd'
import { LockOutlined, UserOutlined, SaveOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/api'

interface UserForm {
  oldUsername: string
  oldPassword: string
  newUsername: string
  newPassword: string
  confirmPassword: string
}

export default function User() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const username = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)

  const handleUpdateUser = async (values: UserForm) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    if (values.newPassword && values.newPassword.length < 6) {
      message.error('新密码长度至少 6 位')
      return
    }

    if (values.newUsername && values.newUsername.length < 3) {
      message.error('用户名长度至少 3 位')
      return
    }

    setLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('oldUsername', values.oldUsername)
      formData.append('oldPassword', values.oldPassword)
      formData.append('newUsername', values.newUsername || values.oldUsername)
      formData.append('newPassword', values.newPassword || values.oldPassword)
      
      const res = await api.post('/xui/setting/updateUser', formData)
      if (res.data.success) {
        message.success('用户信息修改成功，请重新登录')
        form.resetFields()
        setTimeout(() => {
          logout()
          window.location.href = '/app/login'
        }, 1500)
      }
    } catch (error) {
      console.error('Update user error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 当前用户信息 */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <UserOutlined className="text-white text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{username || '管理员'}</h2>
            <p className="text-gray-500">系统管理员</p>
          </div>
        </div>
      </Card>

      {/* 修改用户信息 */}
      <Card title="修改用户信息">
        <Alert
          message="安全提示"
          description="修改用户名或密码后需要重新登录，请确保记住新的登录信息。"
          type="info"
          showIcon
          className="mb-4"
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
          className="max-w-md"
          initialValues={{ oldUsername: username || '' }}
        >
          <Divider orientation="left">验证身份</Divider>
          
          <Form.Item
            label="当前用户名"
            name="oldUsername"
            rules={[{ required: true, message: '请输入当前用户名' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="请输入当前用户名"
            />
          </Form.Item>

          <Form.Item
            label="当前密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请输入当前密码"
            />
          </Form.Item>

          <Divider orientation="left">新信息（留空则不修改）</Divider>

          <Form.Item
            label="新用户名"
            name="newUsername"
            rules={[
              { min: 3, message: '用户名长度至少 3 位' },
              { pattern: /^[a-zA-Z0-9_]*$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="留空则不修改用户名"
            />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { min: 6, message: '密码长度至少 6 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="留空则不修改密码"
            />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const newPassword = getFieldValue('newPassword')
                  if (!newPassword || !value || newPassword === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 危险操作 */}
      <Card title="其他操作" className="border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">退出登录</h4>
            <p className="text-gray-500 text-sm">退出当前账户</p>
          </div>
          <Button
            danger
            onClick={() => {
              logout()
              window.location.href = '/app/login'
            }}
          >
            退出登录
          </Button>
        </div>
      </Card>
    </div>
  )
}
