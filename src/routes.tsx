import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskDetails from './pages/TaskDetails';
import Users from './pages/Users';
import Departments from './pages/Departments';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import { Spin } from 'antd';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, fetchUser } = useAuthStore();
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="task/:id" element={<TaskDetails />} />
        <Route path="users" element={<Users />} />
        <Route path="departments" element={<Departments />} />
        <Route path="profile" element={<Profile />} />
        <Route path="statistics" element={<Statistics />} />
        {/* Add more routes here */}
        <Route path="*" element={<div className="p-8">404 Not Found</div>} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;