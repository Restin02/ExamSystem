import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Changed to Login.css for specific styling

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); 
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const loginUrl = role === 'admin' 
            ? 'http://127.0.0.1:8000/api/auth/token/'  
            : 'http://127.0.0.1:8000/api/login/';      

        try {
            const res = await axios.post(loginUrl, { 
                username: username.trim(), 
                password: password.trim()
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('username', res.data.username);
            localStorage.setItem('is_superuser', res.data.is_superuser ? 'true' : 'false');

            if (onLogin) onLogin();

            if (role === 'admin') {
                if (res.data.is_superuser === true) {
                    navigate('/admin-home');
                } else {
                    alert("Access denied. Admin role requires superuser privileges.");
                    localStorage.clear(); 
                }
            } else {
                navigate('/staff-dashboard');
            }
        } catch (err) {
            alert("Login failed: Check your credentials.");
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h2>Exam Management System</h2>
                    <p>Enter your credentials to access the {role} portal</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="role-toggle">
                        <div 
                            className={`role-option ${role === 'user' ? 'active' : ''}`}
                            onClick={() => setRole('user')}
                        >
                            Staff
                        </div>
                        <div 
                            className={`role-option ${role === 'admin' ? 'active' : ''}`}
                            onClick={() => setRole('admin')}
                        >
                            Admin
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            name="username"
                            autoComplete="username" 
                            placeholder="e.g. jsmith24" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password"
                                autoComplete="current-password"
                                placeholder="••••••••" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                            <button 
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit-btn">
                        Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;