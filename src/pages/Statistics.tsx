import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Spin } from 'antd';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionRate: number;
  avgCompletionDays: number;
}

interface DeptStats {
  name: string;
  total: number;
  completed: number;
  rate: number;
}

interface UserStats {
  id: string;
  name: string;
  completed: number;
}

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completionRate: 0,
    avgCompletionDays: 0,
  });
  const [deptStats, setDeptStats] = useState<DeptStats[]>([]);
  const [topUsers, setTopUsers] = useState<UserStats[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // 1. Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, assignee:users!assignee_id(full_name, department_id)');

      if (tasksError) throw tasksError;

      if (!tasks) return;

      // 2. Calculate basic stats
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate average completion time (mock calculation as we don't have start_time)
      // For real calculation, we would need a 'started_at' or 'completed_at' timestamp diff
      // Here we just use a placeholder logic or 0 if not applicable
      const avgCompletionDays = 0; 

      setStats({
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate,
        avgCompletionDays
      });

      // 3. Calculate Department Stats
      const { data: departments } = await supabase.from('departments').select('*');
      
      if (departments) {
        const deptStatsData = departments.map(dept => {
          // Find tasks assigned to users in this department
          // Note: This requires complex joining or fetching users first. 
          // Simplified: We assume we can get department info from the joined user data in tasks
          // But Supabase join in step 1 returned assignee:users which is an object or array.
          
          // Let's filter tasks based on assignee's department_id
          // Since the join above returns assignee object, we need to check its structure.
          // In JS client, it returns object if single relation.
          
          const deptTasks = tasks.filter((t: any) => t.assignee?.department_id === dept.id);
          const deptTotal = deptTasks.length;
          const deptCompleted = deptTasks.filter((t: any) => t.status === 'completed').length;
          
          return {
            name: dept.name,
            total: deptTotal,
            completed: deptCompleted,
            rate: deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0
          };
        });
        setDeptStats(deptStatsData);
      }

      // 4. Calculate Top Users
      const userMap = new Map<string, { name: string, count: number }>();
      
      tasks.forEach((t: any) => {
        if (t.status === 'completed' && t.assignee) {
          const userId = t.assignee_id;
          const userName = t.assignee.full_name;
          
          if (!userMap.has(userId)) {
            userMap.set(userId, { name: userName, count: 0 });
          }
          
          userMap.get(userId)!.count += 1;
        }
      });

      const topUsersData = Array.from(userMap.entries())
        .map(([id, val]) => ({ id, name: val.name, completed: val.count }))
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);

      setTopUsers(topUsersData);

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spin size="large" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">统计报表</h2>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="已完成任务"
              value={stats.completedTasks}
              suffix={`/ ${stats.totalTasks}`}
              prefix={<CheckCircle size={20} className="text-green-500" />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="待处理任务"
              value={stats.pendingTasks}
              prefix={<Clock size={20} className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="进行中任务"
              value={stats.inProgressTasks}
              prefix={<AlertCircle size={20} className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="整体完成率"
              value={stats.completionRate}
              suffix="%"
              prefix={<TrendingUp size={20} className="text-purple-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="部门任务完成率" bordered={false} className="shadow-sm">
            <div className="space-y-4">
              {deptStats.length > 0 ? deptStats.map(dept => (
                <div key={dept.name}>
                  <div className="flex justify-between mb-1">
                    <span>{dept.name}</span>
                    <span>{dept.rate}% ({dept.completed}/{dept.total})</span>
                  </div>
                  <Progress percent={dept.rate} status="active" />
                </div>
              )) : <div className="text-gray-400 text-center py-4">暂无部门数据</div>}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="个人贡献 Top 5 (已完成任务数)" bordered={false} className="shadow-sm">
            <div className="space-y-4">
              {topUsers.length > 0 ? topUsers.map((person, index) => (
                <div key={person.id} className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${index < 3 ? 'bg-yellow-100 text-yellow-600 font-bold' : 'bg-gray-100 text-gray-500'}`}>
                      {index + 1}
                    </span>
                    <span>{person.name}</span>
                  </div>
                  <span className="font-semibold text-gray-700">{person.completed} 个</span>
                </div>
              )) : <div className="text-gray-400 text-center py-4">暂无完成记录</div>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Statistics;