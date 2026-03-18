import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExamDutyView = ({ token }) => {
    const [dutyData, setDutyData] = useState({ allocations: [], availability: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchExamDuties = async () => {
            if (!token) return;
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/staff/exam-duties/', {
                    headers: { Authorization: `Token ${token}` }
                });
                setDutyData(res.data);
                setError(null);
            } catch (err) {
                console.error("Exam Duty Fetch Error:", err);
                setError("Could not load exam duties. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchExamDuties();
    }, [token]);

    if (loading) return <div className="loader">Syncing duty records...</div>;

    return (
        <div className="exam-duty-container">
            {error && (
                <div className="error-message" style={{ 
                    padding: '15px', backgroundColor: '#fee2e2', color: '#b91c1c', 
                    borderRadius: '8px', marginBottom: '20px', border: '1px solid #f87171' 
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* SECTION 1: PERSONAL AVAILABILITY SUMMARY */}
            {/* SECTION 1: PERSONAL AVAILABILITY SUMMARY */}
<div className="card" style={{ borderLeft: '4px solid #3498db', marginBottom: '30px' }}>
    <div className="card-header">
        <h3>📅 My Availability Schedule</h3>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Records of your availability for upcoming exam slots:
        </p>
    </div>
    
    <div className="availability-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '15px', 
        marginTop: '15px' 
    }}>
        {dutyData.availability?.length > 0 ? (
            dutyData.availability.map((item, idx) => (
                <div key={idx} className="availability-card" style={{ 
                    padding: '15px', 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                }}>
                    {/* 1. DATE & DAY - Using 'date' as defined in AvailabilitySerializer */}
                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                        {item.date} | <span style={{ color: '#3498db' }}>{item.day}</span>
                    </div>

                    {/* 2. SESSION */}
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>
                        Session: {item.session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}
                    </div>

                    {/* 3. EXAM TYPE */}
                    <div style={{ 
                        display: 'inline-block',
                        alignSelf: 'flex-start',
                        padding: '4px 10px',
                        background: '#e0f2fe',
                        color: '#f70d0d',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        marginTop: '5px'
                    }}>
                        {item.exam_type}
                    </div>

                    
                </div>
            ))
        ) : (
            <div style={{ textAlign: 'center', width: '100%', padding: '20px', color: '#94a3b8' }}>
                <p>No availability records found.</p>
            </div>
        )}
    </div>
</div>

            {/* SECTION 2: CLASSROOM ALLOCATIONS */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3>🏫 My Classroom Assignments</h3>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Your assigned exam locations and duty details</p>
                    </div>
                    <button className="btn-secondary no-print" onClick={() => window.print()} 
                        style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                        🖨️ Print Schedule
                    </button>
                </div>

                <div className="table-responsive" style={{ marginTop: '20px' }}>
                    <table className="staff-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Date & Day</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Session</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Exam Type</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Block</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Room</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dutyData.allocations?.length > 0 ? (
                                dutyData.allocations.map((duty, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px' }}>
                                            <strong>{duty.date}</strong> <br/> 
                                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{duty.day}</span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{duty.session}</td>
                                        <td style={{ padding: '12px' }}>{duty.exam_type}</td>
                                        <td style={{ padding: '12px' }}>{duty.block || 'Main Block'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ 
                                                background: '#1e293b', color: 'white', 
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {duty.room_no}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                                                <span style={{ height: '10px', width: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
                                                Confirmed
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📁</div>
                                        No room allocations assigned to you yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="no-print" style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontSize: '0.85rem', padding: '20px' }}>
                <p>Note: Please report to the exam cell 15 minutes before the session starts.</p>
                <p style={{ marginTop: '5px' }}>© 2026 Automated Exam Management System</p>
            </footer>
        </div>
    );
};

export default ExamDutyView;