import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Signup, Step 2: OTP
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '', name: '', email: '', phone: '', password: '', otp: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Submit Details & Trigger OTP
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Save user to DB & Send OTP
      await axios.post('http://127.0.0.1:8000/api/signup/', formData);
      alert("Details saved! Please check the terminal for your OTP.");
      setStep(2); // Move to OTP step
    } catch (err) {
      alert("Error during signup. Username or Email might already exist.");
    }
  };

  // Step 2: Verify OTP & Go to Dashboard
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/verify-otp/', {
        email: formData.email,
        otp: formData.otp
      });
      
      // Save token and go to dashboard
      localStorage.setItem('token', response.data.token);
      alert("Verification successful!");
      navigate('/dashboard');
    } catch (err) {
      alert("Invalid OTP. Please check the terminal again.");
    }
  };

  return (
    <div className="signup-container">
      {step === 1 ? (
        <form className="signup-card" onSubmit={handleSignupSubmit}>
          <h2>Staff Registration</h2>
          <input name="name" placeholder="Full Name" onChange={handleChange} required />
          <input name="username" placeholder="Username" onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="phone" placeholder="Phone Number" onChange={handleChange} required />
          
          <div className="password-field">
            <input 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              onChange={handleChange} 
              required 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "👁️" : "🙈"}
            </button>
          </div>
          
          <button type="submit" className="signup-btn">Register & Send OTP</button>
        </form>
      ) : (
        <form className="signup-card" onSubmit={handleVerifyOTP}>
          <h2>Verify Email</h2>
          <p>An OTP has been sent to {formData.email}</p>
          <input name="otp" placeholder="Enter 6-digit OTP" onChange={handleChange} required />
          <button type="submit" className="verify-btn">Verify & Login</button>
        </form>
      )}
    </div>
  );
}

export default Signup;