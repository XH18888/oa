import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Form, Select, message, Popconfirm, Card, Input } from 'antd';
import { User as UserIcon, Shield, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, Department } from '../types';
import { useAuthStore } from '../store/authStore';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*, department:departments!department_id(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      role: user.role,
      department_id: user.department_id,
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: values.role,
          department_id: values.department_id,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      message.success('用户信息更新成功');
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      message.error('更新失败: ' + error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      message.success('用户已删除');
      fetchUsers();
    } catch (error: any) {
      console.error('Delete error:', error);
      message.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1 rounded-full text-blue-600">
            <UserIcon size={16} />
          </div>
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'green';
        if (role === 'admin') color = 'red';
        if (role === 'manager') color = 'blue';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: '部门',
      dataIndex: ['department', 'name'],
      key: 'department',
      render: (text: string) => text || <span className="text-gray-400">未分配</span>,
    },
    {
      title: '加入时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <div className="flex gap-2">
          <Button 
            type="link" 
            size="small"
            onClick={() => handleEdit(record)}
            disabled={currentUser?.role !== 'admin'}
          >
            编辑
          </Button>
          {currentUser?.role === 'admin' && currentUser.id !== record.id && (
            <Popconfirm
              title="确认删除此用户？"
              description="此操作无法撤销。该用户的相关数据（任务、评论等）将被保留但可能失去关联。"
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
              okType="danger"
            >
              <Button type="link" danger size="small">
                删除
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">用户管理</h2>
        <div className="flex gap-4">
          <Input 
            prefix={<Search size={16} className="text-gray-400" />} 
            placeholder="搜索用户..." 
            className="w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="编辑用户权限"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="employee">Employee</Select.Option>
              <Select.Option value="manager">Manager</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="department_id"
            label="部门"
          >
            <Select allowClear placeholder="选择部门">
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setIsModalOpen(false)} className="mr-2">
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;