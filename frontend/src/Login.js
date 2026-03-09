import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Table.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); 
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        
        const loginUrl = role === 'admin' 
            ? 'http://127.0.0.1:8000/api/auth/token/'  
            : 'http://127.0.0.1:8000/api/login/';     

        try {
            const res = await axios.post(loginUrl, { 
                username, 
                password 
            });

            // 1. Store the authentication data
            // Note: We convert boolean to string because localStorage only stores strings
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('is_superuser', String(res.data.is_superuser));
            localStorage.setItem('username', res.data.username);

            // 2. Notify the parent/App.js that we are logged in
            if (onLogin) onLogin();

            // 3. Redirect Logic
            if (role === 'admin') {
                // Check the value coming directly from the response
                if (res.data.is_superuser === true) {
                    navigate('/admin-home');
                } else {
                    alert("Access denied. You do not have Superuser privileges.");
                    // Clean up storage if they aren't actually an admin
                    localStorage.clear();
                }
            } else {
                navigate('/staff-dashboard');
            }

        } catch (err) {
            console.error("Login error detail:", err.response);
            const errorMessage = err.response?.data?.error || "Invalid Username or Password";
            alert("Login failed: " + errorMessage);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleLogin}>
                <h2>Staff Portal Login</h2>
                
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />

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