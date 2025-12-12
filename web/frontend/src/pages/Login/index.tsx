import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { authApi } from '@/api/auth'

interface LoginForm {
  username: string
  password: string
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(values)
      if (res.success) {
        login(values.username)
        message.success('登录成功')
        navigate('/dashboard')
      }
    } catch {
      message.error('登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="w-full max-w-md shadow-2xl" bordered={false}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">X-UI Panel</h1>
          <p className="text-gray-500 mt-2">多协议代理面板管理系统</p>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-12 text-lg"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        
        <div className="text-center text-gray-400 text-sm">
          <p>© 2025 X-UI Panel. All rights reserved.</p>
        </div>
      </Card>
    </div>
  )
}
