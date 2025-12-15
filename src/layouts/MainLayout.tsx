import React, { useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Building,
  BarChart2, 
  LogOut, 
  User as UserIcon,
  Menu as MenuIcon
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [collapsed, setCollapsed] = React.useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      label: '任务列表',
    },
    // {
    //   key: '/tasks',
    //   icon: <CheckSquare size={18} />,
    //   label: '所有任务',
    // },
    {
      key: '/statistics',
      icon: <BarChart2 size={18} />,
      label: '统计报表',
    },
  ];

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/users',
      icon: <Users size={18} />,
      label: '用户管理',
    });
    menuItems.push({
      key: '/departments',
      icon: <Building size={18} />,
      label: '部门管理',
    });
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人资料',
        icon: <UserIcon size={14} />,
        onClick: () => navigate('/profile'),
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogOut size={14} />,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="border-r border-gray-200">
        <div className="flex items-center justify-center h-16 border-b border-gray-200 overflow-hidden">
          <Logo collapsed={collapsed} />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          className="border-none mt-2"
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} className="flex items-center justify-between px-6 border-b border-gray-200">
          <Button
            type="text"
            icon={<MenuIcon size={18} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Welcome, {user?.full_name}
            </span>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar className="cursor-pointer bg-blue-500" icon={<UserIcon size={20} />} />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;