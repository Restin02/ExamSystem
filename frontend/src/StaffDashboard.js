import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './StaffHome.css';
import ProfileSettings from './ProfileSettings';
import ExamDutyView from './ExamDuty'; 
import StudentAttendance from './StudentAttendance';

const StaffDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard'); 
    const token = localStorage.getItem('token');

    const BASE_URL = 'http://127.0.0.1:8000';

    const handleLogout = useCallback(() => {
        localStorage.clear();
        window.location.href = '/login';
    }, []);

    const fetchMyData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${BASE_URL}/api/staff/my-dashboard/`, {
                headers: { Authorization: `Token ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Fetch Error:", err.response?.data);
            if (err.response?.status === 401) handleLogout();
        } finally {
            setLoading(false);
        }
    }, [token, handleLogout]);

    useEffect(() => {
        fetchMyData();
    }, [fetchMyData]);

    const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Prepare FormData
    const formData = new FormData();
    formData.append('profile_pic', file); // MUST match the backend key

    try {
        setLoading(true);
        const res = await axios.post(`${BASE_URL}/api/staff/upload-image/`, formData, {
            headers: { 
                Authorization: `Token ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        // 2. Update local state immediately so the user sees the new photo
        setData(prev => ({
            ...prev,
            profile: {
                ...prev.profile,
                image_url: res.data.image_url // Use the URL returned by Django
            }
        }));

        alert("Profile picture updated!");
    } catch (err) {
        const errorMsg = err.response?.data?.error || "Upload failed";
        alert("Error: " + errorMsg);
        console.error("Upload Error:", err.response);
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
                <button className="menu-trigger" onClick={handleLogout}>Back to Login</button>
            </div>
        );
    }

    return (
        <div className="staff-dashboard-root">
            {/* 1. SIDE NAVIGATION */}
            <aside className={`side-nav ${menuOpen ? 'open' : ''}`}>
                <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
                <div className="nav-header"><h3>STAFF PORTAL</h3></div>
                <nav className="nav-links">
                    <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}>🏠 <span>Dashboard</span></button>
                    <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => { setActiveTab('attendance'); setMenuOpen(false); }}>✅ <span>Attendance</span></button>
                    <button className={activeTab === 'exam' ? 'active' : ''} onClick={() => { setActiveTab('exam'); setMenuOpen(false); }}>📋 <span>Exam Duty</span></button>
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => { setActiveTab('profile'); setMenuOpen(false); }}>⚙️ <span>Profile</span></button>
                    <hr className="nav-divider" />
                    <button className="logout-btn" onClick={handleLogout}>🚪 <span>Logout</span></button>
                </nav>
            </aside>

            {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}></div>}

            <main className="staff-container">
                {/* 2. TOP BAR */}
                <header className="top-bar">
                    <div className="nav-left">
                        <button className="menu-trigger" onClick={() => setMenuOpen(true)}>☰ Menu</button>
                        <h2>{activeTab.toUpperCase()}</h2>
                    </div>
                </header>

                {/* PROFILE HEADER CARD */}
<div className="staff-header-profile-card">
    <div className="profile-section-horizontal">
        <div className="profile-image-wrapper">
            <div className="image-container">
                <img 
                    src={data.profile.image_url || 'https://via.placeholder.com/150'} 
                    alt="Profile" 
                    className="profile-img" 
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                />
            </div>
            <label className="upload-button-outside">
                ✎ Update Photo
                <input type="file" onChange={handleImageUpload} hidden accept="image/*" />
            </label>
        </div>

        <div className="profile-main-content">
            <div className="profile-identity">
                <div className="name-status">
                    <div>
                        <h1>{data.profile.name}</h1>
                        {/* Correctly displaying Grade from database */}
                        <p style={{ margin: 0, color: '#f4f7f6', fontWeight: '600' }}>
                            {data.profile.grade}
                        </p>
                    </div>
                    <span className="status-pill">Active</span>
                </div>
                <div className="meta-grid-horizontal">
                    <div className="meta-item"><strong>Dept:</strong> {data.profile.department}</div>
                    <div className="meta-item"><strong>Branch:</strong> {data.profile.branch}</div>
                    <div className="meta-item"><strong>Email:</strong> {data.profile.email}</div>
                </div>
            </div>

            {/* DUTY COUNTS - These will now pull from the flattened backend data */}
            <div className="duty-status-grid-horizontal">
                <div className="duty-item">
                    <small>Internal 1</small>
                    <strong>{data.profile.internal1_duty_count || 0}</strong>
                </div>
                <div className="duty-item">
                    <small>Internal 2</small>
                    <strong>{data.profile.internal2_duty_count || 0}</strong>
                </div>
                <div className="duty-item">
                    <small>Regular</small>
                    <strong>{data.profile.regular_duty_count || 0}</strong>
                </div>
                <div className="duty-item">
                    <small>Supply</small>
                    <strong>{data.profile.supply_duty_count || 0}</strong>
                </div>
            </div>
        </div>
    </div>
</div>

                {/* 3. DYNAMIC CONTENT AREA */}
                <div className="staff-content-body">
                    {activeTab === 'dashboard' && (
                        <div className="dashboard-content">
                            <section className="timetable-card">
                                <div className="card-header"><h3>Weekly Workload Schedule</h3></div>
                                <div className="table-responsive">
                                    <table className="staff-view-table">
                                        <thead>
                                            <tr>
                                                <th>Day</th>
                                                {[1, 2, 3, 4, 5, 6].map(p => <th key={p}>P{p}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.timetable?.map((row, i) => (
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

                            <section className="timetable-card free-hours-section" style={{ marginTop: '20px' }}>
                                <div className="card-header"><h3>Available (Free) Periods</h3></div>
                                <div className="free-hours-grid">
                                    {data.timetable?.map((row, i) => (
                                        <div key={i} className="free-hour-row">
                                            <span className="row-day">{row.day}</span>
                                            <span className="free-hour-pill">{getFreePeriods(row.periods)}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'attendance' && <StudentAttendance token={token} />}
                    {activeTab === 'exam' && <ExamDutyView token={token} />}
                    {activeTab === 'profile' && <ProfileSettings token={token} initialData={data.profile} refreshData={fetchMyData} />}
                </div>
            </main>
        </div>
    );
};

export default StaffDashboard;