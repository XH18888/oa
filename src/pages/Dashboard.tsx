import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, Avatar, Tooltip, Row, Col, Statistic, Empty, Spin, Modal, Form, Input, Select, DatePicker, message, Switch, Progress, Segmented } from 'antd';
import { Plus, CheckCircle, Clock, AlertCircle, Search, Filter, Calendar } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '../lib/supabase';
import { Task, User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>('pending');

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    fetchTasks();
    fetchUsers();

    // Subscribe to realtime changes
    const taskSubscription = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          if (!document.hidden) {
            fetchTasks();
          }
        }
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(taskSubscription);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users!assignee_id(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (values: any) => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: values.title,
          description: values.description,
          priority: values.priority,
          assignee_id: values.assignee_id,
          creator_id: user?.id,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
          status: 'pending'
        });

      if (error) throw error;

      message.success('任务创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchTasks();
    } catch (error: any) {
      message.error(error.message || '任务创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const currentTask = active.data.current?.task as Task;

    if (currentTask && currentTask.status !== newStatus) {
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus as any } : t
      ));

      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', taskId);

        if (error) throw error;
        message.success(`任务状态更新为: ${newStatus}`);
      } catch (error) {
        console.error('Error updating task status:', error);
        message.error('状态更新失败');
        fetchTasks(); // Rollback
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = showMyTasksOnly 
      ? task.assignee_id === user?.id 
      : (assigneeFilter === 'all' || task.assignee_id === assigneeFilter);
    
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  if (loading) return <div className="flex justify-center p-12"><Spin size="large" /></div>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">任务列表</h2>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            新建任务
          </Button>
        </div>

        <Card bordered={false} className="mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <Input 
              prefix={<Search size={16} className="text-gray-400" />} 
              placeholder="搜索任务标题或描述..." 
              className="w-64"
              allowClear
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <Select 
              defaultValue="all" 
              style={{ width: 120 }} 
              onChange={setPriorityFilter}
              options={[
                { value: 'all', label: '所有优先级' },
                { value: 'high', label: '高优先级' },
                { value: 'medium', label: '中优先级' },
                { value: 'low', label: '低优先级' },
              ]}
            />

            {!showMyTasksOnly && (
              <Select 
                defaultValue="all" 
                style={{ width: 160 }} 
                onChange={setAssigneeFilter}
                placeholder="筛选负责人"
                value={assigneeFilter}
              >
                <Select.Option value="all">所有负责人</Select.Option>
                {users.map(u => (
                  <Select.Option key={u.id} value={u.id}>{u.full_name}</Select.Option>
                ))}
              </Select>
            )}

            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-gray-600">只看我的</span>
              <Switch checked={showMyTasksOnly} onChange={setShowMyTasksOnly} />
            </div>

            <div className="ml-auto text-gray-500 text-sm">
              共 {filteredTasks.length} 个任务
            </div>
          </div>
        </Card>

        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Card onClick={() => setActiveStatus('pending')} className={`cursor-pointer transition-colors ${activeStatus === 'pending' ? 'border-blue-500' : ''}`}>
              <Statistic
                title="待处理"
                value={pendingTasks.length}
                prefix={<Clock size={20} className="text-gray-500" />}
                valueStyle={{ color: '#595959' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card onClick={() => setActiveStatus('in_progress')} className={`cursor-pointer transition-colors ${activeStatus === 'in_progress' ? 'border-blue-500' : ''}`}>
              <Statistic
                title="进行中"
                value={inProgressTasks.length}
                prefix={<AlertCircle size={20} className="text-blue-500" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card onClick={() => setActiveStatus('completed')} className={`cursor-pointer transition-colors ${activeStatus === 'completed' ? 'border-blue-500' : ''}`}>
              <Statistic
                title="已完成"
                value={completedTasks.length}
                prefix={<CheckCircle size={20} className="text-green-500" />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <div className="mb-4">
          <Segmented
            block
            size="large"
            options={[
              { label: `待处理 (${pendingTasks.length})`, value: 'pending', icon: <Clock size={16} /> },
              { label: `进行中 (${inProgressTasks.length})`, value: 'in_progress', icon: <AlertCircle size={16} /> },
              { label: `已完成 (${completedTasks.length})`, value: 'completed', icon: <CheckCircle size={16} /> },
            ]}
            value={activeStatus}
            onChange={(value) => setActiveStatus(value as string)}
          />
        </div>

        <div className="w-full">
          {activeStatus === 'pending' && (
            <DroppableColumn id="pending" title="待处理" count={pendingTasks.length} color="gray">
              {pendingTasks.map(task => (
                <DraggableTaskCard key={task.id} task={task} onClick={() => navigate(`/task/${task.id}`)} />
              ))}
            </DroppableColumn>
          )}
          {activeStatus === 'in_progress' && (
            <DroppableColumn id="in_progress" title="进行中" count={inProgressTasks.length} color="blue">
              {inProgressTasks.map(task => (
                <DraggableTaskCard key={task.id} task={task} onClick={() => navigate(`/task/${task.id}`)} />
              ))}
            </DroppableColumn>
          )}
          {activeStatus === 'completed' && (
            <DroppableColumn id="completed" title="已完成" count={completedTasks.length} color="green">
              {completedTasks.map(task => (
                <DraggableTaskCard key={task.id} task={task} onClick={() => navigate(`/task/${task.id}`)} />
              ))}
            </DroppableColumn>
          )}
        </div>
        
        <Modal
          title="新建任务"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateTask}
          >
            <Form.Item
              name="title"
              label="任务标题"
              rules={[{ required: true, message: '请输入任务标题' }]}
            >
              <Input placeholder="请输入任务标题" />
            </Form.Item>

            <Form.Item
              name="description"
              label="任务描述"
            >
              <Input.TextArea rows={4} placeholder="请输入任务描述" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label="优先级"
                  initialValue="medium"
                >
                  <Select>
                    <Select.Option value="low">低</Select.Option>
                    <Select.Option value="medium">中</Select.Option>
                    <Select.Option value="high">高</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="assignee_id"
                  label="负责人"
                  rules={[{ required: true, message: '请选择负责人' }]}
                >
                  <Select placeholder="选择负责人">
                    {users.map(u => (
                      <Select.Option key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="due_date"
              label="截止日期"
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item className="mb-0 text-right">
              <Button onClick={() => setIsModalOpen(false)} className="mr-2">
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                创建任务
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DndContext>
  );
};

const DroppableColumn: React.FC<{ id: string; title: string; count: number; color: string; children: React.ReactNode }> = ({ id, title, count, color, children }) => {
  const { setNodeRef } = useDroppable({ id });
  
  // Tailwind color classes logic
  let bgColor = 'bg-gray-50';
  let titleColor = 'text-gray-600';
  let tagColor = 'default';

  if (color === 'blue') {
    bgColor = 'bg-blue-50';
    titleColor = 'text-blue-600';
    tagColor = 'blue';
  } else if (color === 'green') {
    bgColor = 'bg-green-50';
    titleColor = 'text-green-600';
    tagColor = 'green';
  }

  return (
    <div ref={setNodeRef} className={`${bgColor} p-4 rounded-lg h-full flex flex-col`}>
      <h3 className={`font-semibold mb-4 ${titleColor} flex items-center justify-between`}>
        {title} <Tag color={tagColor}>{count}</Tag>
      </h3>
      <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2">
        {children}
      </div>
    </div>
  );
};

const DraggableTaskCard: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
};

const TaskCard: React.FC<{ task: Task; onClick: () => void }> = ({ task, onClick }) => {
  const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'completed';
  const isDueSoon = task.due_date && dayjs(task.due_date).diff(dayjs(), 'day') <= 2 && dayjs(task.due_date).isAfter(dayjs(), 'day') && task.status !== 'completed';
  
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtaskCount = task.subtasks?.filter(st => st.completed).length || 0;
  
  // Logic for progress percent:
  // If has subtasks, calculate normally.
  // If NO subtasks, check main status: completed = 100%, otherwise 0%
  let progressPercent = 0;
  if (subtaskCount > 0) {
    progressPercent = Math.round((completedSubtaskCount / subtaskCount) * 100);
  } else {
    progressPercent = task.status === 'completed' ? 100 : 0;
  }

  return (
    <Card 
      className={`mb-3 hover:shadow-md cursor-pointer transition-shadow ${isOverdue ? 'border-red-400 border' : ''} ${isDueSoon ? 'border-orange-300 border' : ''}`} 
      size="small" 
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-800 line-clamp-2">{task.title}</h4>
        <Tag color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'blue'}>
          {task.priority}
        </Tag>
      </div>
      
      <div className="text-gray-500 text-sm mb-2 line-clamp-2 min-h-[40px]">
        {task.description || '无描述'}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>进度</span>
          <span>{subtaskCount > 0 ? `${completedSubtaskCount}/${subtaskCount}` : (task.status === 'completed' ? '已完成' : '进行中')}</span>
        </div>
        <Progress percent={progressPercent} size="small" showInfo={false} strokeColor={progressPercent === 100 ? "#52c41a" : "#1890ff"} />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Tooltip title={task.assignee?.full_name || 'Unassigned'}>
            <Avatar size="small" className="bg-blue-500">
              {task.assignee?.full_name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </Tooltip>
          <span className="text-xs text-gray-500">
            {new Date(task.created_at).toLocaleDateString()}
          </span>
        </div>
        
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-bold' : isDueSoon ? 'text-orange-500' : 'text-gray-400'}`}>
            <Calendar size={12} />
            <span>{dayjs(task.due_date).format('MM-DD')}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Dashboard;