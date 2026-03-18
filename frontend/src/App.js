import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './Login';
import StaffHome from './StaffDashboard';
import AdminHome from './AdminHome';

function App() {
  // 1. Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('token') !== null;
  });

  const [isSuperuser, setIsSuperuser] = useState(() => {
    return localStorage.getItem('is_superuser') === 'true';
  });

  // 2. Function to update state after login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsSuperuser(localStorage.getItem('is_superuser') === 'true');
  };

  // 3. Keep state in sync
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const adminStatus = localStorage.getItem('is_superuser') === 'true';
      setIsAuthenticated(!!token);
      setIsSuperuser(adminStatus);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLoginSuccess} />
            ) : isSuperuser ? (
              <Navigate to="/admin-home" replace />
            ) : (
              <Navigate to="/staff-home" replace /> // Redirect to StaffHome
            )
          } 
        />

        {/* Unified Staff Home - Protected */}
        <Route 
          path="/staff-home" 
          element={isAuthenticated ? <StaffHome /> : <Navigate to="/login" replace />} 
        />

        {/* Admin Route - Protected */}
        <Route 
          path="/admin-home" 
          element={isAuthenticated && isSuperuser ? <AdminHome /> : <Navigate to="/login" replace />} 
        />

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;