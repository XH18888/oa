import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Select, Spin, message, List, Avatar, Input, Form, Divider, Descriptions, Checkbox, Progress, Modal, Tooltip, DatePicker } from 'antd';
import { ArrowLeft, Send, User, Calendar, Clock, AlertCircle, Plus, Trash2, Edit2, X, GripVertical, Check, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Task, Comment, Subtask, User as UserType } from '../types';
import { useAuthStore } from '../store/authStore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

// Sortable Subtask Item Component
const SortableSubtaskItem = ({ 
  subtask, 
  onToggle, 
  onDelete, 
  onEdit, 
  isEditing, 
  editValue, 
  setEditValue, 
  onSaveEdit, 
  onCancelEdit 
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-md transition-colors bg-white mb-2 border border-gray-100"
    >
      <div className="flex items-center gap-3 flex-grow">
        <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
          <GripVertical size={16} />
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2 flex-grow">
            <Input 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)}
              onPressEnter={() => onSaveEdit(subtask.id)}
              autoFocus
              size="small"
            />
            <Button 
              type="text" 
              size="small" 
              icon={<Check size={14} />} 
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => onSaveEdit(subtask.id)}
            />
            <Button 
              type="text" 
              size="small" 
              icon={<XCircle size={14} />} 
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={onCancelEdit}
            />
          </div>
        ) : (
          <Checkbox 
            checked={subtask.completed}
            onChange={() => onToggle(subtask.id)}
            className={subtask.completed ? 'line-through text-gray-400' : ''}
          >
            {subtask.title}
          </Checkbox>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            type="text" 
            size="small" 
            icon={<Edit2 size={14} />} 
            onClick={() => onEdit(subtask)}
            className="text-gray-400 hover:text-blue-500 mr-1"
          />
          <Button 
            type="text" 
            danger 
            size="small" 
            icon={<Trash2 size={14} />} 
            onClick={() => onDelete(subtask.id)}
          />
        </div>
      )}
    </div>
  );
};

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [form] = Form.useForm();
  
  // Comment editing state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // Subtask editing state
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Collaborators state
  const [collaborators, setCollaborators] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);

  // Edit Task State
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editTaskForm] = Form.useForm();
  const [isEditingTask, setIsEditingTask] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
      fetchComments();
      fetchCollaborators();
      fetchAllUsers();

      // Subscribe to task updates
      const taskSubscription = supabase
        .channel(`task-detail-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tasks',
            filter: `id=eq.${id}`,
          },
          () => {
            if (!document.hidden) {
              fetchTaskDetails();
            }
          }
        )
        .subscribe();

      // Subscribe to comments updates
      const commentSubscription = supabase
        .channel(`comments-detail-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `task_id=eq.${id}`,
          },
          () => {
            if (!document.hidden) {
              fetchComments();
            }
          }
        )
        .subscribe();

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchTaskDetails();
          fetchComments();
        }
      };
  
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        supabase.removeChannel(taskSubscription);
        supabase.removeChannel(commentSubscription);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:users!assignee_id(*), creator:users!creator_id(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error: any) {
      console.error('Error fetching task:', error);
      message.error('获取任务详情失败');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('task_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from('task_collaborators')
        .select('user:users(*)')
        .eq('task_id', id);

      if (error) throw error;
      setCollaborators(data?.map((item: any) => item.user) || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedCollabId) return;

    try {
      const { error } = await supabase
        .from('task_collaborators')
        .insert({
          task_id: id,
          user_id: selectedCollabId
        });

      if (error) throw error;

      message.success('已添加协作成员');
      setIsCollabModalOpen(false);
      setSelectedCollabId(null);
      fetchCollaborators();
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        message.warning('该用户已经是协作成员');
      } else {
        message.error('添加失败');
      }
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('task_collaborators')
        .delete()
        .eq('task_id', id)
        .eq('user_id', userId);

      if (error) throw error;

      message.success('已移除协作成员');
      fetchCollaborators();
    } catch (error) {
      message.error('移除失败');
    }
  };

  const handleStatusChange = async (value: string) => {
    // Permission check
    const isCollaborator = collaborators.some(c => c.id === user?.id);
    const canEdit = user?.role === 'admin' || 
                    user?.id === task?.assignee_id || 
                    user?.id === task?.creator_id ||
                    isCollaborator;

    if (!canEdit) {
      message.error('您没有权限修改此任务状态');
      return;
    }

    try {
      setStatusUpdating(true);
      
      // Rule 4: If manually setting to completed, mark all subtasks as completed
      let updateData: any = { status: value };
      let newSubtasks = task?.subtasks;

      if (value === 'completed' && task?.subtasks && task.subtasks.length > 0) {
        const hasUncompleted = task.subtasks.some(st => !st.completed);
        if (hasUncompleted) {
          newSubtasks = task.subtasks.map(st => ({ ...st, completed: true }));
          updateData.subtasks = newSubtasks;
          message.info('已自动将所有子任务标记为完成');
        }
      } 
      // Rule 5: If changing from completed to in_progress, reset the LAST completed subtask
      else if (task?.status === 'completed' && value === 'in_progress' && task?.subtasks && task.subtasks.length > 0) {
        // Create a deep copy to ensure state update triggers correctly
        const subtasksCopy = JSON.parse(JSON.stringify(task.subtasks));
        const completedSubtasks = subtasksCopy.filter((st: Subtask) => st.completed);
        
        if (completedSubtasks.length > 0) {
          // Find the last completed subtask
          const lastCompletedSubtask = completedSubtasks[completedSubtasks.length - 1];
          newSubtasks = subtasksCopy.map((st: Subtask) => 
            st.id === lastCompletedSubtask.id ? { ...st, completed: false } : st
          );
          updateData.subtasks = newSubtasks;
          message.info('任务状态变更为进行中，已重置最后一个完成的子任务');
        } else {
            // Edge case: status was completed but no subtasks were completed (maybe manually set before adding subtasks)
            // In this case, just keep subtasks as is (all false)
            newSubtasks = subtasksCopy;
        }
      }
      // Rule 6: If changing from completed to pending, reset ALL subtasks
      else if (task?.status === 'completed' && value === 'pending' && task?.subtasks && task.subtasks.length > 0) {
        newSubtasks = task.subtasks.map(st => ({ ...st, completed: false }));
        updateData.subtasks = newSubtasks;
        message.info('任务状态变更为待处理，已重置所有子任务');
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      setTask(prev => prev ? { ...prev, status: value as any, subtasks: newSubtasks } : null);
      message.success('状态更新成功');
    } catch (error: any) {
      message.error('状态更新失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async (values: any) => {
    if (!user) return;
    
    try {
      setCommentLoading(true);
      const { error } = await supabase
        .from('comments')
        .insert({
          task_id: id,
          user_id: user.id,
          content: values.content
        });

      if (error) throw error;

      message.success('评论已发送');
      form.resetFields();
      fetchComments();
    } catch (error: any) {
      message.error('发送评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条评论吗？此操作无法撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

          if (error) throw error;
          message.success('评论已删除');
          fetchComments();
        } catch (error: any) {
          message.error('删除评论失败');
        }
      }
    });
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent('');
  };

  const saveEditComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editCommentContent })
        .eq('id', commentId);

      if (error) throw error;

      message.success('评论已更新');
      setEditingCommentId(null);
      setEditCommentContent('');
      fetchComments();
    } catch (error: any) {
      message.error('更新评论失败');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spin size="large" /></div>;
  if (!task) return <div className="p-8 text-center">任务不存在</div>;

  const checkAndUpdateTaskStatus = async (currentSubtasks: Subtask[]) => {
    if (!task) return;

    const allCompleted = currentSubtasks.length > 0 && currentSubtasks.every(st => st.completed);
    
    // Rule 1: If all subtasks completed, set task to completed
    if (allCompleted && task.status !== 'completed') {
      try {
        await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', task.id);
        
        setTask(prev => prev ? { ...prev, status: 'completed' } : null);
        message.success('所有子任务已完成，任务自动标记为已完成');
      } catch (error) {
        console.error('Error auto-updating task status:', error);
      }
    }
    // Rule 3: If task was completed but new subtask added (or existing unchecked), set to in_progress
    else if (!allCompleted && task.status === 'completed') {
      try {
        await supabase
          .from('tasks')
          .update({ status: 'in_progress' })
          .eq('id', task.id);
        
        setTask(prev => prev ? { ...prev, status: 'in_progress' } : null);
        message.info('子任务未全部完成，任务状态自动更为进行中');
      } catch (error) {
        console.error('Error auto-updating task status:', error);
      }
    }
  };

  const handleDeleteTask = () => {
    Modal.confirm({
      title: '确认删除任务',
      content: '确定要删除这个任务吗？此操作无法撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

          if (error) throw error;

          message.success('任务已删除');
          navigate('/dashboard');
        } catch (error: any) {
          message.error('删除任务失败');
        }
      }
    });
  };

  const handleEditTask = async (values: any) => {
    try {
      setIsEditingTask(true);
      const { error } = await supabase
        .from('tasks')
        .update({
          title: values.title,
          description: values.description,
          priority: values.priority,
          assignee_id: values.assignee_id,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        })
        .eq('id', id);

      if (error) throw error;

      message.success('任务更新成功');
      setIsEditTaskModalOpen(false);
      fetchTaskDetails();
    } catch (error: any) {
      message.error('任务更新失败');
    } finally {
      setIsEditingTask(false);
    }
  };

  const openEditTaskModal = () => {
    if (!task) return;
    editTaskForm.setFieldsValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee_id: task.assignee_id,
      due_date: task.due_date ? dayjs(task.due_date) : null,
    });
    setIsEditTaskModalOpen(true);
  };

  const handleAddSubtask = async () => {
    if (!subtaskInput.trim() || !task) return;

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title: subtaskInput,
      completed: false
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, subtasks: updatedSubtasks });
      setSubtaskInput('');
      message.success('子任务添加成功');
      
      // Check status update rules
      checkAndUpdateTaskStatus(updatedSubtasks);
    } catch (error) {
      console.error('Error adding subtask:', error);
      message.error('添加子任务失败');
    }
  };

  const toggleSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, subtasks: updatedSubtasks });
      
      // Check status update rules
      checkAndUpdateTaskStatus(updatedSubtasks);
    } catch (error) {
      console.error('Error toggling subtask:', error);
      message.error('更新子任务失败');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, subtasks: updatedSubtasks });
      message.success('子任务已删除');
      
      // Check status update rules
      checkAndUpdateTaskStatus(updatedSubtasks);
    } catch (error) {
      console.error('Error deleting subtask:', error);
      message.error('删除子任务失败');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && task && task.subtasks) {
      const oldIndex = task.subtasks.findIndex((item) => item.id === active.id);
      const newIndex = task.subtasks.findIndex((item) => item.id === over.id);

      const newSubtasks = arrayMove(task.subtasks, oldIndex, newIndex);
      
      // Optimistic update
      setTask({ ...task, subtasks: newSubtasks });

      try {
        const { error } = await supabase
          .from('tasks')
          .update({ subtasks: newSubtasks })
          .eq('id', task.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error reordering subtasks:', error);
        message.error('重新排序失败');
        // Revert on error could be implemented here if needed
      }
    }
  };

  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditSubtaskTitle(subtask.title);
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditSubtaskTitle('');
  };

  const saveEditSubtask = async (subtaskId: string) => {
    if (!editSubtaskTitle.trim() || !task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, title: editSubtaskTitle } : st
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ subtasks: updatedSubtasks })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, subtasks: updatedSubtasks });
      setEditingSubtaskId(null);
      setEditSubtaskTitle('');
      message.success('子任务更新成功');
    } catch (error) {
      console.error('Error updating subtask:', error);
      message.error('更新子任务失败');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'blue';
    }
  };

  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtaskCount = task.subtasks?.filter(st => st.completed).length || 0;
  
  let progressPercent = 0;
  if (subtaskCount > 0) {
    progressPercent = Math.round((completedSubtaskCount / subtaskCount) * 100);
  } else {
    progressPercent = task.status === 'completed' ? 100 : 0;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Button type="link" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard')} className="pl-0 text-gray-600">
          返回看板
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card bordered={false} className="shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-0">{task.title}</h1>
              <div className="flex gap-2 items-center">
                <Tag color={getPriorityColor(task.priority)} className="mr-0 capitalize">
                  {task.priority} Priority
                </Tag>
                {(user?.role === 'admin' || user?.id === task.creator_id || user?.id === task.assignee_id) && (
                  <div className="flex gap-1 ml-2">
                    <Button 
                      type="text" 
                      icon={<Edit2 size={16} />} 
                      onClick={openEditTaskModal}
                      className="text-gray-500 hover:text-blue-500"
                    />
                    <Button 
                      type="text" 
                      danger
                      icon={<Trash2 size={16} />} 
                      onClick={handleDeleteTask}
                      className="text-gray-500 hover:text-red-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-gray-500 text-sm font-medium mb-4 uppercase flex justify-between items-center">
                <span>任务进度</span>
                <span className="text-gray-600 font-normal normal-case">
                  {subtaskCount > 0 ? `${completedSubtaskCount} / ${subtaskCount}` : (task.status === 'completed' ? '100%' : '0%')}
                </span>
              </h3>
              
              <Progress 
                percent={progressPercent} 
                strokeColor={progressPercent === 100 ? "#52c41a" : "#1890ff"}
                className="mb-4"
              />

              <div className="space-y-2 mb-4">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={task.subtasks?.map(st => st.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {task.subtasks?.map(subtask => (
                      <SortableSubtaskItem 
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={toggleSubtask}
                        onDelete={handleDeleteSubtask}
                        onEdit={startEditSubtask}
                        isEditing={editingSubtaskId === subtask.id}
                        editValue={editSubtaskTitle}
                        setEditValue={setEditSubtaskTitle}
                        onSaveEdit={saveEditSubtask}
                        onCancelEdit={cancelEditSubtask}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="添加新子任务..." 
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onPressEnter={handleAddSubtask}
                />
                <Button icon={<Plus size={16} />} onClick={handleAddSubtask}>
                  添加
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-gray-500 text-sm font-medium mb-2 uppercase">描述</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">
                {task.description || '无描述'}
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-gray-500 text-sm font-medium mb-4 uppercase">评论 ({comments.length})</h3>
              
              <List
                className="mb-6"
                itemLayout="horizontal"
                dataSource={comments}
                renderItem={(item) => (
                  <List.Item className="px-0">
                    <List.Item.Meta
                      avatar={
                        <Avatar className="bg-blue-100 text-blue-600">
                          {item.user?.full_name?.[0]?.toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">{item.user?.full_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</span>
                            {(user?.id === item.user_id || user?.role === 'admin') && !editingCommentId && (
                              <div className="flex gap-1">
                                {user?.id === item.user_id && (
                                  <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<Edit2 size={12} />} 
                                    onClick={() => startEditComment(item)}
                                    className="text-gray-400 hover:text-blue-500"
                                  />
                                )}
                                <Button 
                                  type="text" 
                                  size="small" 
                                  icon={<Trash2 size={12} />} 
                                  onClick={() => handleDeleteComment(item.id)}
                                  className="text-gray-400 hover:text-red-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      }
                      description={
                        editingCommentId === item.id ? (
                          <div className="mt-2">
                            <TextArea 
                              rows={2} 
                              value={editCommentContent} 
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="mb-2"
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="small" onClick={cancelEditComment}>取消</Button>
                              <Button size="small" type="primary" onClick={() => saveEditComment(item.id)}>保存</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-600 mt-1">{item.content}</div>
                        )
                      }
                    />
                  </List.Item>
                )}
              />

              <div className="flex gap-4">
                <Avatar className="bg-blue-500 flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase()}
                </Avatar>
                <div className="flex-grow">
                  <Form form={form} onFinish={handleAddComment}>
                    <Form.Item name="content" rules={[{ required: true, message: '请输入评论内容' }]}>
                      <TextArea rows={3} placeholder="写下你的评论..." />
                    </Form.Item>
                    <div className="text-right">
                      <Button type="primary" htmlType="submit" icon={<Send size={14} />} loading={commentLoading}>
                        发送
                      </Button>
                    </div>
                  </Form>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card title="任务状态" bordered={false} className="shadow-sm">
            <div className="mb-4">
              <span className="block text-gray-500 text-sm mb-2">当前状态</span>
              <Select 
                value={task.status} 
                style={{ width: '100%' }} 
                onChange={handleStatusChange}
                loading={statusUpdating}
              >
                <Option value="pending">待处理</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
              </Select>
            </div>
          </Card>

          <Card title="详细信息" bordered={false} className="shadow-sm">
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label={<span className="flex items-center gap-1"><User size={14} /> 负责人</span>}>
                <div className="flex items-center gap-2">
                  <Avatar size="small" className="bg-blue-100 text-blue-600">
                    {task.assignee?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  {task.assignee?.full_name}
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label={<span className="flex items-center gap-1"><User size={14} /> 创建人</span>}>
                <div className="flex items-center gap-2">
                  <Avatar size="small" className="bg-gray-100 text-gray-600">
                    {task.creator?.full_name?.[0]?.toUpperCase()}
                  </Avatar>
                  {task.creator?.full_name}
                </div>
              </Descriptions.Item>

              <Descriptions.Item label={<span className="flex items-center gap-1"><Calendar size={14} /> 截止日期</span>}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '未设置'}
              </Descriptions.Item>

              <Descriptions.Item label={<span className="flex items-center gap-1"><Clock size={14} /> 创建时间</span>}>
                {new Date(task.created_at).toLocaleString()}
              </Descriptions.Item>

              <Descriptions.Item label={<span className="flex items-center gap-1"><User size={14} /> 协作成员</span>}>
                <div className="flex flex-wrap gap-2 mb-2">
                  {collaborators.map(collab => (
                    <Tooltip key={collab.id} title={collab.full_name}>
                      <div className="relative group">
                        <Avatar size="small" className="bg-purple-100 text-purple-600 cursor-default">
                          {collab.full_name?.[0]?.toUpperCase()}
                        </Avatar>
                        {(user?.id === task.creator_id || user?.role === 'admin') && (
                          <div 
                            className="absolute -top-1 -right-1 hidden group-hover:flex bg-white rounded-full shadow-sm cursor-pointer"
                            onClick={() => handleRemoveCollaborator(collab.id)}
                          >
                            <X size={12} className="text-red-500" />
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  ))}
                  {(user?.id === task.creator_id || user?.role === 'admin') && (
                    <Button 
                      type="dashed" 
                      shape="circle" 
                      size="small" 
                      icon={<Plus size={12} />} 
                      onClick={() => setIsCollabModalOpen(true)}
                    />
                  )}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </div>

      <Modal
        title="添加协作成员"
        open={isCollabModalOpen}
        onCancel={() => setIsCollabModalOpen(false)}
        onOk={handleAddCollaborator}
        okText="添加"
        cancelText="取消"
      >
        <Select
          showSearch
          placeholder="搜索并选择用户"
          optionFilterProp="children"
          onChange={setSelectedCollabId}
          value={selectedCollabId}
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={allUsers
            .filter(u => u.id !== task.assignee_id && u.id !== task.creator_id && !collaborators.some(c => c.id === u.id))
            .map(u => ({
              value: u.id,
              label: `${u.full_name} (${u.email})`,
            }))
          }
        />
      </Modal>

      <Modal
        title="编辑任务"
        open={isEditTaskModalOpen}
        onCancel={() => setIsEditTaskModalOpen(false)}
        footer={null}
      >
        <Form
          form={editTaskForm}
          layout="vertical"
          onFinish={handleEditTask}
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

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="priority"
              label="优先级"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="low">低</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="high">高</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="assignee_id"
              label="负责人"
              rules={[{ required: true, message: '请选择负责人' }]}
            >
              <Select placeholder="选择负责人">
                {allUsers.map(u => (
                  <Select.Option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="due_date"
            label="截止日期"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setIsEditTaskModalOpen(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={isEditingTask}>
              保存修改
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskDetails;