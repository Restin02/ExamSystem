import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login({ onLogin }) { // <--- We destructure onLogin from props
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents page from refreshing
    
    // TEMPORARY ALERT: To confirm the function is running
    alert("The button was clicked! Checking credentials..."); 

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', {
        username: username,
        password: password
      });

      // 1. Save the token to localStorage
      localStorage.setItem('token', response.data.token);

      // 2. CRUCIAL: Tell App.js we are authenticated so the route unlocks
      if (onLogin) onLogin(); 

      console.log("Login Successful, Token saved!");
      
      // 3. Navigate to dashboard
      navigate('/dashboard'); 
    } catch (error) {
      console.error("Login Error Details:", error.response ? error.response.data : error.message);
      
      if (error.response && error.response.status === 400) {
        alert("Invalid Username or Password.");
      } else {
        alert("Server connection failed. Is Django running?");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Staff Portal Login</h2>
        
        {/* The form handles the submission */}
        <form onSubmit={handleLogin}> 
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
          
          {/* type="submit" tells the form to trigger onSubmit */}
          <button type="submit" className="login-button">Login In</button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/signup">Sign Up here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;