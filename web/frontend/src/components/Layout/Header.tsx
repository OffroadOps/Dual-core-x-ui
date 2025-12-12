import { Layout, Button, Dropdown, Space, Avatar } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingStore } from '@/stores/useSettingStore'

const { Header: AntHeader } = Layout

interface HeaderProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

export default function Header({ collapsed, onCollapse }: HeaderProps) {
  const navigate = useNavigate()
  const { username, logout } = useAuthStore()
  const { theme, toggleTheme } = useSettingStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user',
      icon: <UserOutlined />,
      label: '用户设置',
      onClick: () => navigate('/user'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <AntHeader className="!bg-white !px-4 flex items-center justify-between shadow-sm">
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => onCollapse(!collapsed)}
        className="text-lg"
      />
      
      <Space size="middle">
        <Button
          type="text"
          icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleTheme}
        />
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="text-gray-700">{username || 'Admin'}</span>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  )
}
