import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import StaffDashboard from './StaffDashboard';
import { useState } from 'react';
import Profile from './Profile';
import AdminHome from './AdminHome';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route 
          path="/staff-dashboard" element={isAuthenticated ? <StaffDashboard /> : <Navigate to="/login" />} 
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/admin-home" element={<AdminHome />} />
      </Routes>
    </Router>
  );
}

export default App;