export type UserRole = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  manager_id?: string;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  creator_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee?: User; // Joined
  creator?: User; // Joined
  subtasks?: Subtask[];
  collaborators?: { user: User }[]; // Joined
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User; // Joined
}
