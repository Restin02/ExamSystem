import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StaffHome.css';

const StudentAttendance = ({ token }) => {
    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const BASE_URL = 'http://127.0.0.1:8000';

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/api/staff/my-students/`, {
                    headers: { Authorization: `Token ${token}` }
                });
                const studentsWithStatus = res.data.map(s => ({ ...s, status: 'Present' }));
                setStudents(studentsWithStatus);
            } catch (err) {
                console.error("Error fetching students:", err);
            }
        };
        if (token) fetchStudents();
    }, [token]);

    const handleStatusChange = (id, newStatus) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            await axios.post(`${BASE_URL}/api/staff/submit-attendance/`, {
                date: date,
                attendance_data: students.map(s => ({ student_id: s.id, status: s.status }))
            }, {
                headers: { Authorization: `Token ${token}` }
            });
            setMessage({ type: 'success', text: 'Attendance submitted successfully!' });
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to submit attendance. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="staff-container">
            <div className="timetable-card">
                <div className="top-bar" style={{ boxShadow: 'none', padding: '0', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--sidebar-bg)', margin: 0 }}>Mark Student Attendance</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Session Date:</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)}
                            className="staff-view-table"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', width: 'auto' }}
                        />
                    </div>
                </div>

                {message.text && (
                    <div className={`status-pill`} style={{ 
                        backgroundColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        textTransform: 'none'
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="staff-view-table">
                            <thead>
                                <tr>
                                    <th className="day-col">Roll No</th>
                                    <th>Student Name</th>
                                    <th>Department</th>
                                    <th>Attendance Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? students.map((student) => (
                                    <tr key={student.id} className={student.status === 'Absent' ? 'slot-absent' : ''}>
                                        <td className="day-col">{student.roll_no}</td>
                                        <td><strong>{student.name}</strong></td>
                                        <td><span className="subject-badge" style={{ background: '#eee', color: '#666' }}>{student.department}</span></td>
                                        <td>
                                            <select 
                                                value={student.status} 
                                                onChange={(e) => handleStatusChange(student.id, e.target.value)}
                                                className="staff-view-table"
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    borderRadius: '20px', 
                                                    border: '1px solid #ddd',
                                                    backgroundColor: student.status === 'Present' ? '#e8f5e9' : student.status === 'Absent' ? '#ffebee' : '#fff3e0',
                                                    color: student.status === 'Present' ? '#2e7d32' : student.status === 'Absent' ? '#c62828' : '#ef6c00',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="Present">Present</option>
                                                <option value="Absent">Absent</option>
                                                <option value="Late">Late</option>
                                            </select>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '40px', color: 'var(--text-muted)' }}>No students found in your department.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'right' }}>
                        <button 
                            type="submit" 
                            disabled={loading || students.length === 0}
                            className="menu-trigger"
                            style={{ padding: '12px 35px', fontSize: '1rem' }}
                        >
                            {loading ? 'Processing...' : 'Submit Records'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentAttendance;