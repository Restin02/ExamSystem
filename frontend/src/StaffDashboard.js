import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './StaffDashboard.css';
import ProfileSettings from './ProfileSettings'; 

const StaffDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard'); 
    const token = localStorage.getItem('token');

    const fetchMyData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            // UPDATED: Removed /user/ to match your current Django backend/urls.py
            const res = await axios.get('http://127.0.0.1:8000/api/staff/my-dashboard/', {
                headers: { Authorization: `Token ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Fetch Error:", err.response?.data);
            // If token is invalid, log them out
            if (err.response?.status === 401) handleLogout();
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchMyData();
    }, [fetchMyData]);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setLoading(true);
            // Ensure this matches the /api/ prefix
            await axios.post('http://127.0.0.1:8000/api/staff/upload-image/', formData, {
                headers: { 
                    Authorization: `Token ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            await fetchMyData(); // Refresh to show new image
        } catch (err) {
            alert("Upload failed. Ensure 'Pillow' is installed: pip install Pillow");
        } finally {
            setLoading(false);
        }
    };

    const getFreePeriods = (periods) => {
        if (!periods) return 'No Data';
        const free = periods
            .map((p, index) => (p ? null : `P${index + 1}`))
            .filter(p => p !== null);
        return free.length > 0 ? free.join(', ') : 'No Free Slots';
    };

    if (loading) return <div className="loader">Loading Dashboard...</div>;

    if (!data || !data.profile) {
        return (
            <div className="error-container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <p>Unable to load profile data. Your session may have expired.</p>
                <button className="btn-primary" onClick={handleLogout}>Back to Login</button>
            </div>
        );
    }

    return (
        <div className="staff-dashboard-root">
            {/* SIDE NAVIGATION */}
            <div className={`side-nav ${menuOpen ? 'open' : ''}`}>
                <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
                <div className="nav-header" style={{ padding: '20px', color: '#fff', borderBottom: '1px solid #444' }}>
                    <h3>Menu</h3>
                </div>
                <div className="nav-links">
                    <button 
                        className={activeTab === 'dashboard' ? 'active-link' : ''} 
                        onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}
                    >
                        🏠 View My Schedule
                    </button>
                    <button 
                        className={activeTab === 'profile' ? 'active-link' : ''} 
                        onClick={() => { setActiveTab('profile'); setMenuOpen(false); }}
                    >
                        ⚙️ Profile Settings
                    </button>
                    <button onClick={() => alert("Loading Exam Duty Schedule...")}>📋 Exam Duty Schedule</button>
                    <hr style={{ border: '0.5px solid #444', width: '100%', margin: '15px 0' }} />
                    <button className="logout-btn" onClick={handleLogout} style={{ color: '#ff4d4d' }}>🚪 Logout</button>
                </div>
            </div>

            <div className="staff-container">
                <div className="top-bar">
                    <button className="menu-trigger" onClick={() => setMenuOpen(true)}>☰ Menu</button>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                        {activeTab === 'dashboard' ? 'Dashboard' : 'Profile Settings'}
                    </h2>
                </div>

                <header className="staff-header">
                    <div className="profile-section">
                        <div className="image-container">
                            <img 
                                src={data.profile.image_url ? `http://127.0.0.1:8000${data.profile.image_url}` : 'https://via.placeholder.com/150'} 
                                alt="Profile" 
                                className="profile-img" 
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                            />
                            <label className="upload-label">
                                ✎ Change
                                <input type="file" onChange={handleImageUpload} hidden accept="image/*" />
                            </label>
                        </div>

                        <div className="profile-info">
                            {/* Displaying Title + Name correctly */}
                            <h1>{data.profile.title || ''} {data.profile.name}</h1>
                            <div className="meta-grid">
                                <span><strong>Grade:</strong> {data.profile.grade || 'N/A'}</span> 
                                <span><strong>Dept:</strong> {data.profile.department || 'N/A'}</span>
                                <span><strong>Branch:</strong> {data.profile.branch || 'N/A'}</span>
                                <span><strong>Email:</strong> {data.profile.email || 'N/A'}</span>
                                <span><strong>Status:</strong> <span className="status-pill">Active</span></span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENT AREA */}
                {activeTab === 'dashboard' ? (
                    <>
                        <section className="timetable-card">
                            <div className="card-header">
                                <h3>Weekly Workload Schedule</h3>
                                <p>Mon - Fri | Periods 1 - 6</p>
                            </div>
                            <div className="table-responsive">
                                <table className="staff-view-table">
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            {[1, 2, 3, 4, 5, 6].map(p => <th key={p}>P{p}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.timetable && data.timetable.map((row, i) => (
                                            <tr key={i}>
                                                <td className="day-col">{row.day}</td>
                                                {row.periods.map((p, j) => (
                                                    <td key={j} className={p ? "slot filled" : "slot empty"}>
                                                        {p ? <div className="subject-badge">{p}</div> : <span className="free-label">Free</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="timetable-card" style={{ marginTop: '30px', borderTop: '4px solid #27ae60' }}>
                            <div className="card-header">
                                <h3>My Free Hour Summary</h3>
                                <p>Available time slots for the current week</p>
                            </div>
                            <div className="table-responsive" style={{ padding: '0 20px 20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Day</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Available Periods</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.timetable && data.timetable.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#2c3e50', width: '150px' }}>{row.day}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span className="free-hour-pill" style={{ 
                                                        color: '#27ae60', 
                                                        fontWeight: '600', 
                                                        background: '#e8f5e9', 
                                                        padding: '5px 12px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {getFreePeriods(row.periods)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                ) : (
                    <ProfileSettings 
                        token={token} 
                        initialData={data.profile} 
                        refreshData={fetchMyData} 
                    />
                )}
            </div>
        </div>
    );
};

export default StaffDashboard;