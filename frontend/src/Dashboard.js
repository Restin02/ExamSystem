import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Table.css';

const Dashboard = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const periods = ["1", "2", "3", "4", "5", "6"];
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTimetable = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/profile/', {
                    headers: { Authorization: `Token ${token}` }
                });
                setTimetable(res.data.timetable || {});
            } catch (err) {
                console.error("Dashboard Load Error");
            } finally {
                setLoading(false);
            }
        };
        fetchTimetable();
    }, []);

    if (loading) return <div className="loader">Loading Portal...</div>;

    return (
        <div className="dashboard-wrapper">
            {/* Header Section */}
            <header className="dashboard-header no-print">
                <div className="header-left">
                    <h1>Staff Portal</h1>
                    <p>Welcome back to your duty schedule</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => window.print()}>Print PDF</button>
                    <button className="btn-primary" onClick={() => navigate('/profile')}>Edit Profile</button>
                </div>
            </header>

            {/* Table Section */}
            <main className="table-card">
                <h3 className="print-only">Official Duty Roster</h3>
                <table className="schedule-table">
                    <thead>
                        <tr>
                            <th>Day</th>
                            {periods.map(p => <th key={p}>Period {p}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day}>
                                <td className="day-column">{day}</td>
                                {periods.map(p => {
                                    const value = timetable[`${day}-${p}`] || "Nil";
                                    return (
                                        <td key={p} className={value !== "Nil" ? "slot-filled" : "slot-empty"}>
                                            {value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
};

export default Dashboard;