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
            const res = await axios.get('http://127.0.0.1:8000/api/staff/my-dashboard/', {
                headers: { Authorization: `Token ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Fetch Error:", err.response?.data);
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
            await axios.post('http://127.0.0.1:8000/api/staff/upload-image/', formData, {
                headers: { 
                    Authorization: `Token ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            await fetchMyData(); 
        } catch (err) {
            alert("Upload failed.");
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
            <div className="error-container">
                <p>Unable to load profile data. Your session may have expired.</p>
                <button className="btn-primary" onClick={handleLogout}>Back to Login</button>
            </div>
        );
    }

    return (
        <div className="staff-dashboard-root">
            {/* Side Navigation */}
            <div className={`side-nav ${menuOpen ? 'open' : ''}`}>
                <button className="close-btn" onClick={() => setMenuOpen(false)}>×</button>
                <div className="nav-header">
                    <h3>Menu</h3>
                </div>
                <div className="nav-links">
                    <button className={activeTab === 'dashboard' ? 'active-link' : ''} onClick={() => { setActiveTab('dashboard'); setMenuOpen(false); }}>🏠 My Schedule</button>
                    <button className={activeTab === 'profile' ? 'active-link' : ''} onClick={() => { setActiveTab('profile'); setMenuOpen(false); }}>⚙️ Profile Settings</button>
                    <button onClick={() => alert("Exam Schedule Feature Coming Soon")}>📋 Exam Duty</button>
                    <hr className="nav-divider" />
                    <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
                </div>
            </div>

            <div className="staff-container">
                <div className="top-bar">
                    <button className="menu-trigger" onClick={() => setMenuOpen(true)}>☰ Menu</button>
                    <h2>{activeTab === 'dashboard' ? 'Staff Dashboard' : 'Profile Settings'}</h2>
                </div>

                <header className="staff-header">
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
                                    <h1>{data.profile.title || ''} {data.profile.name}</h1>
                                    <span className="status-pill">Active</span>
                                </div>
                                
                                <div className="meta-grid-horizontal">
                                    <div className="meta-item"><strong>Grade:</strong> {data.profile.grade || 'N/A'}</div>
                                    <div className="meta-item"><strong>Dept:</strong> {data.profile.department || 'N/A'}</div>
                                    <div className="meta-item"><strong>Branch:</strong> {data.profile.branch || 'N/A'}</div>
                                    <div className="meta-item"><strong>Phonr:</strong> {data.profile.phone_number || 'N/A'}</div>
                                    <div className="meta-item"><strong>Email:</strong> {data.profile.email || 'N/A'}</div>
                                </div>
                            </div>

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
                </header>

                {activeTab === 'dashboard' ? (
                    <div className="dashboard-content">
                        <section className="timetable-card">
                            <div className="card-header">
                                <h3>Weekly Workload Schedule</h3>
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

                        <section className="timetable-card free-hours-section">
                            <div className="card-header">
                                <h3>Available Periods</h3>
                            </div>
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