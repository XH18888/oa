import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { User, Lock, Mail, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('login');

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      await fetchUser();
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
          },
        },
      });

      if (error) throw error;

      message.success('注册成功，请登录');
      setActiveTab('login');
    } catch (error: any) {
      message.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg" bordered={false}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">RORCC OA</h1>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form
                  name="login"
                  initialValues={{ remember: true }}
                  onFinish={onFinishLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="email"
                    rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱' }]}
                  >
                    <Input prefix={<Mail size={18} className="text-gray-400" />} placeholder="邮箱" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password prefix={<Lock size={18} className="text-gray-400" />} placeholder="密码" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form
                  name="register"
                  onFinish={onFinishRegister}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="full_name"
                    rules={[{ required: true, message: '请输入您的姓名' }]}
                  >
                    <Input prefix={<User size={18} className="text-gray-400" />} placeholder="姓名" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱' }]}
                  >
                    <Input prefix={<Mail size={18} className="text-gray-400" />} placeholder="邮箱" />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
                  >
                    <Input.Password prefix={<Lock size={18} className="text-gray-400" />} placeholder="密码" />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;