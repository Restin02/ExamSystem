import React, { useState } from 'react';
import axios from 'axios';

const StaffDetailsView = ({ staffList, token }) => {
    const [viewingStaff, setViewingStaff] = useState(null);
    const [viewingTimetable, setViewingTimetable] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSelectStaffForView = async (username) => {
        const staff = staffList.find(s => s.username === username);
        setViewingStaff(staff);
        setLoading(true);

        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/admin/get-staff-timetable/${username}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setViewingTimetable(res.data.schedule || res.data.timetable || []);
        } catch (err) { 
            console.error("Fetch Error:", err);
            setViewingTimetable([]); 
        } finally {
            setLoading(false);
        }
    };

    // Helper to get formatted free periods (e.g., "P1, P3, P4")
    const getFreePeriods = (periods) => {
        const free = periods
            .map((p, index) => (p ? null : `P${index + 1}`))
            .filter(p => p !== null);
        return free.length > 0 ? free.join(', ') : 'None';
    };

    return (
        <div className="tab-section">
            <h3>Staff Profile & Schedule</h3>
            <div className="admin-form" style={{ marginBottom: '20px' }}>
                <label>Select Staff Member</label>
                <select onChange={(e) => handleSelectStaffForView(e.target.value)} defaultValue="">
                    <option value="" disabled>-- Select Staff --</option>
                    {staffList.map(s => (
                        <option key={s.id || s.username} value={s.username}>
                            {s.name} ({s.username})
                        </option>
                    ))}
                </select>
            </div>

            {loading && <p className="loader">Loading profile data...</p>}

            {viewingStaff && !loading && (
                <div className="staff-container" style={{ animation: 'fadeIn 0.5s' }}>
                    {/* Header Section */}
                    <header className="staff-header">
                        <div className="profile-info">
                            <h1>{viewingStaff.name}</h1>
                            <div className="meta-grid">
                                <span><strong>Grade:</strong> {viewingStaff.grade || 'N/A'}</span>
                                <span><strong>Dept:</strong> {viewingStaff.department || viewingStaff.dept || 'N/A'}</span>
                                <span><strong>Branch:</strong> {viewingStaff.branch || 'N/A'}</span>
                                <span><strong>Email:</strong> {viewingStaff.email || 'N/A'}</span>
                            </div>
                        </div>
                    </header>

                    {/* Timetable Section */}
                    <section className="timetable-card">
                        <div className="card-header">
                            <h3>Weekly Workload Schedule</h3>
                            <p>Mon - Fri | Periods 1 - 6</p>
                        </div>
                        {viewingTimetable.length === 0 ? (
                            <p style={{ padding: '20px', color: '#e74c3c', fontStyle: 'italic' }}>No timetable data found.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="staff-view-table">
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            {[1, 2, 3, 4, 5, 6].map(p => <th key={p}>P{p}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingTimetable.map((row, i) => (
                                            <tr key={i}>
                                                <td className="day-col">{row.day}</td>
                                                {row.periods.map((p, j) => (
                                                    <td key={j}>
                                                        {p ? <div className="subject-badge">{p}</div> : <span className="free-label">Free</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* --- NEW: FREE HOURS SUMMARY SECTION --- */}
                    {viewingTimetable.length > 0 && (
                        <section className="timetable-card" style={{ marginTop: '25px', borderTop: '4px solid #27ae60' }}>
                            <div className="card-header">
                                <h3>Free Hour Summary</h3>
                                <p>Quick view of available slots for allocation</p>
                            </div>
                            <div className="table-responsive" style={{ padding: '10px 20px 20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f9f9f9', borderRadius: '8px', overflow: 'hidden' }}>
                                    <thead>
                                        <tr style={{ background: '#27ae60', color: 'white' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', width: '30%' }}>Day</th>
                                            <th style={{ padding: '12px', textAlign: 'left' }}>Available Periods</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingTimetable.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#2c3e50' }}>{row.day}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{ 
                                                        color: '#27ae60', 
                                                        fontWeight: '600', 
                                                        background: '#e8f5e9', 
                                                        padding: '4px 10px', 
                                                        borderRadius: '15px', 
                                                        fontSize: '0.9rem' 
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
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffDetailsView;