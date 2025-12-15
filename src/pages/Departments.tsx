import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Card } from 'antd';
import { Building, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Department, User } from '../types';
import { useAuthStore } from '../store/authStore';

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*, manager:users!fk_departments_manager(*)');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      message.error('获取部门列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('users').select('*');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAdd = () => {
    setEditingDept(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      manager_id: dept.manager_id,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      message.success('部门已删除');
      fetchDepartments();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update(values)
          .eq('id', editingDept.id);
        if (error) throw error;
        message.success('部门更新成功');
      } else {
        const { error } = await supabase.from('departments').insert(values);
        if (error) throw error;
        message.success('部门创建成功');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 p-1 rounded-full text-orange-600">
            <Building size={16} />
          </div>
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: '部门经理',
      dataIndex: ['manager', 'full_name'],
      key: 'manager',
      render: (text: string) => text || <span className="text-gray-400">未设置</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Department) => (
        <div className="flex gap-2">
          <Button type="text" size="small" icon={<Edit size={16} />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确定要删除这个部门吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" size="small" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-gray-500">您没有权限访问此页面</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">部门管理</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
          新增部门
        </Button>
      </div>

      <Card bordered={false} className="shadow-sm">
        <Table
          columns={columns}
          dataSource={departments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingDept ? '编辑部门' : '新增部门'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" />
          </Form.Item>

          <Form.Item
            name="manager_id"
            label="部门经理"
          >
            <Select allowClear placeholder="选择部门经理">
              {users.map(u => (
                <Select.Option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setIsModalOpen(false)} className="mr-2">
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {editingDept ? '保存' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Departments;