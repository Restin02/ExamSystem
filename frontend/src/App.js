import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './Login';
import StaffDashboard from './StaffDashboard';
import Profile from './Profile';
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

    // Check once on mount
    checkAuth();

    // Optional: Listen for storage changes (like manual localstorage clears)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Login Route: Only one entry. If logged in, it redirects automatically */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLoginSuccess} />
            ) : isSuperuser ? (
              <Navigate to="/admin-home" replace />
            ) : (
              <Navigate to="/staff-dashboard" replace />
            )
          } 
        />

        {/* Staff Route - Protected */}
        <Route 
          path="/staff-dashboard" 
          element={isAuthenticated ? <StaffDashboard /> : <Navigate to="/login" replace />} 
        />

        {/* Admin Route - Protected */}
        <Route 
          path="/admin-home" 
          element={isAuthenticated && isSuperuser ? <AdminHome /> : <Navigate to="/login" replace />} 
        />

        {/* Profile Route - Protected */}
        <Route 
          path="/profile" 
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} 
        />

        {/* Default Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;