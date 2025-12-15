import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Avatar, Divider, Spin } from 'antd';
import { User, Mail, Briefcase, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Department } from '../types';

const Profile: React.FC = () => {
  const { user, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDepartments();
    if (user) {
      form.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
      });
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase.from('departments').select('*');
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Update full_name in public.users table
      const { error } = await supabase
        .from('users')
        .update({
          full_name: values.full_name,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update in auth metadata if needed, but primarily we use the users table
      await supabase.auth.updateUser({
        data: { full_name: values.full_name }
      });

      await fetchUser();
      message.success('个人资料更新成功');
    } catch (error: any) {
      message.error('更新失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="flex justify-center p-12"><Spin size="large" /></div>;

  const departmentName = departments.find(d => d.id === user.department_id)?.name || '未分配';

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">个人资料</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card bordered={false} className="shadow-sm text-center">
            <div className="flex flex-col items-center py-6">
              <Avatar size={100} className="bg-blue-500 mb-4 text-3xl">
                {user.full_name?.[0]?.toUpperCase()}
              </Avatar>
              <h3 className="text-xl font-bold mb-1">{user.full_name}</h3>
              <p className="text-gray-500 mb-4">{user.email}</p>
              
              <div className="w-full flex justify-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase font-semibold">
                  {user.role}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                加入时间: {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card title="基本信息" bordered={false} className="shadow-sm mb-6">
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label={<span className="flex items-center gap-2"><Mail size={16} /> 邮箱</span>}>
                {user.email}
              </Descriptions.Item>
              <Descriptions.Item label={<span className="flex items-center gap-2"><Briefcase size={16} /> 角色</span>}>
                <span className="capitalize">{user.role}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="flex items-center gap-2"><Building size={16} /> 部门</span>}>
                {departmentName}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="修改资料" bordered={false} className="shadow-sm">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdate}
            >
              <Form.Item
                name="full_name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input prefix={<User size={16} className="text-gray-400" />} />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱 (不可修改)"
              >
                <Input disabled prefix={<Mail size={16} className="text-gray-400" />} />
              </Form.Item>

              <Form.Item className="mb-0 text-right">
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存更改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;