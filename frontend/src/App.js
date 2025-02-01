import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import './App.css';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProducerDashboard from './components/dashboards/ProducerDashboard';
import DistributorDashboard from './components/dashboards/DistributorDashboard';
import CustomerDashboard from './components/dashboards/CustomerDashboard';
import ContractTest from './components/ContractTest';
import TransactionMonitor from './components/TransactionMonitor';
import { setupLocalNetwork } from './utils/setupMetaMask';
import ErrorBoundary from './components/ErrorBoundary';
import ActivityViewer from './components/ActivityViewer';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/dashboards/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import SplashScreen from './components/SplashScreen';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import QRCodeGenerator from './components/QRCodeGenerator';

function App() {
  const { user, loading } = useAuth();
  const userRole = localStorage.getItem('userRole');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Protected Route component
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!user || !userRole) {
      console.log('No user or role, redirecting to login');
      return <Navigate to="/login" />;
    }
    if (userRole !== allowedRole) {
      console.log('Wrong role, redirecting to login');
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/register" 
              element={user ? <Navigate to={`/${userRole}/dashboard`} /> : <Register />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/producer/dashboard" 
              element={
                <ProtectedRoute allowedRole="producer">
                  <ProducerDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/distributor/dashboard" 
              element={
                <ProtectedRoute allowedRole="distributor">
                  <DistributorDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/customer/dashboard" 
              element={
                <ProtectedRoute allowedRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Default Routes */}
            <Route 
              path="/" 
              element={
                user && userRole ? 
                  <Navigate to={`/${userRole}/dashboard`} /> : 
                  <Navigate to="/login" />
              } 
            />

            <Route path="/test" element={<ContractTest />} />
            <Route path="/distributor" element={<DistributorDashboard />} />

            <Route path="/activities" element={<ActivityViewer />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AnalyticsDashboard />
                </ProtectedRoute>
              } 
            />

            <Route path="/product/:id/qr" element={<QRCodeGenerator />} />

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App; 