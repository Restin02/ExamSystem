import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Table.css';


const Profile = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const periods = ["1", "2", "3", "4", "5", "6"];
    const options = ["Nil", "S1inmca", "S2inmca", "S3inmca", "S4inmca", "S5inmca", "S6inmca", "S7inmca", "S8inmca", "S9inmca", "S10inmca"];
    
    const [timetable, setTimetable] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/profile/', {
                    headers: { Authorization: `Token ${token}` }
                });
                setTimetable(res.data.timetable || {});
            } catch (err) {
                console.error("Fetch error:", err.response?.data || err.message);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://127.0.0.1:8000/api/profile/', 
                { timetable }, 
                { headers: { Authorization: `Token ${token}` } }
            );
            alert("Timetable Saved!");
            navigate('/dashboard');
        } catch (err) {
            alert("Error saving data. Check console.");
        }
    };

    return (
      <div className="dashboard-wrapper">
            <header className="dashboard-header no-print">
                <div className="header-left">
                    <h1>Edit Profile</h1>
                    <p>Update your weekly duty schedule</p>
                </div>
                <div className="header-actions">
                    {/* 4. Add the Back Button */}
                    <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <button className="btn-primary" onClick={handleSave}>
                        Save Changes
                    </button>
                </div>
            </header>
            <div className="table-card">
                <table className="schedule-table">
                    <thead>
                        <tr>
                            <th>Day/Period</th>
                            {periods.map(p => <th key={p}>{p}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day}>
                                <td className="day-column">{day}</td>
                                {periods.map(p => (
                                    <td key={p}>
                                        <select 
                                            value={timetable[`${day}-${p}`] || "Nil"}
                                            onChange={(e) => setTimetable({...timetable, [`${day}-${p}`]: e.target.value})}
                                        >
                                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Profile;