import { useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  CloudServerOutlined,
  SettingOutlined,
  FileTextOutlined,
  UserOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Sider } = Layout

interface SidebarProps {
  collapsed: boolean
}

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/inbounds',
    icon: <CloudServerOutlined />,
    label: '入站管理',
  },
  {
    key: '/cores',
    icon: <AppstoreOutlined />,
    label: '核心管理',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '面板设置',
  },
  {
    key: '/logs',
    icon: <FileTextOutlined />,
    label: '系统日志',
  },
  {
    key: '/user',
    icon: <UserOutlined />,
    label: '用户设置',
  },
]

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="!bg-slate-900"
      width={220}
    >
      <div className="h-16 flex items-center justify-center border-b border-slate-700">
        <h1 className="text-white text-xl font-bold">
          {collapsed ? 'X' : 'X-UI Panel'}
        </h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        className="!bg-slate-900 border-none mt-2"
      />
    </Sider>
  )
}
