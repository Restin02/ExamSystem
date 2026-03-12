import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Table.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); 
    const [showPassword, setShowPassword] = useState(false); // State for visibility toggle
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
                    alert("Access denied. You do not have Superuser privileges.");
                    localStorage.clear(); 
                }
            } else {
                navigate('/staff-dashboard');
            }

        } catch (err) {
            console.error("Login Error Details:", err.response);
            const errorData = err.response?.data;
            let errorMessage = "Invalid Username or Password";

            if (errorData) {
                if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors[0];
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            }
            alert("Login failed: " + errorMessage);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleLogin} autoComplete="on">
                <h2>Staff Portal Login</h2>
                
                {/* Username with auto-fill support */}
                <div className="form-group">
                    <input 
                        type="text" 
                        name="username" // Name attribute is required for auto-fill
                        autoComplete="username" 
                        placeholder="Username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                </div>

                {/* Password with auto-fill and Visibility Toggle */}
                <div className="form-group" style={{ position: 'relative' }}>
                    <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" // Name attribute is required for auto-fill
                        autoComplete="current-password"
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <span 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            userSelect: 'none',
                            color: '#666'
                        }}
                    >
                        {showPassword ? "Hide" : "Show"}
                    </span>
                </div>

                <div className="role-selection">
                    <label>
                        <input 
                            type="radio" 
                            name="role"
                            value="admin" 
                            checked={role === 'admin'} 
                            onChange={() => setRole('admin')} 
                        /> Admin
                    </label>
                    <label>
                        <input 
                            type="radio" 
                            name="role"
                            value="user" 
                            checked={role === 'user'} 
                            onChange={() => setRole('user')} 
                        /> Staff
                    </label>
                </div>

                <button type="submit" className="btn-primary">Login</button>
            </form>
        </div>
    );
};

export default Login;