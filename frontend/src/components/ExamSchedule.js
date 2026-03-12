import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ExamSchedule = ({ departments, token, renderBranchOptions, renderSemesterOptions }) => {
    // 1. State Definitions
    const [examBase, setExamBase] = useState({ date: '', session: '', examType: 'Internal Test 1' });
    const [examEntries, setExamEntries] = useState([{ dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
    
    // --- STAFF DUTY STATE (Including Exam Type) ---
    const [staffGradeDuty, setStaffGradeDuty] = useState([
    { grade: 'Assistant Professor', examType: 'Internal Test 1', count: '2' }
]);
    
    const [savedSchedules, setSavedSchedules] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [filterDate, setFilterDate] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const getDayName = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    // 2. Fetch Data
    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/admin/get-exams/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            setSavedSchedules(res.data);
        } catch (err) {
            console.error("Error fetching old schedules:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    // 3. Delete Handler
    const handleDeleteSchedule = async (id) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/admin/delete-exam-schedule/${id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            setSavedSchedules(prev => prev.filter(exam => exam.id !== id));
            alert("Exam schedule deleted successfully!");
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete.");
        }
    };

    // 4. Filtering Logic
    const filteredSchedules = savedSchedules.filter(item => {
        const matchesDate = filterDate === '' || item.date === filterDate;
        const matchesDept = filterDept === '' || (item.course_name && item.course_name.includes(filterDept));
        return matchesDate && matchesDept;
    });

    // 5. Entry Management
    const addMoreExamEntry = () => {
        setExamEntries([...examEntries, { dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
    };

    const updateEntry = (index, field, value) => {
        const updated = [...examEntries];
        updated[index][field] = value;
        setExamEntries(updated);
    };

    // --- STAFF DUTY MANAGEMENT FUNCTIONS ---
    const addStaffGrade = () => {
        setStaffGradeDuty([...staffGradeDuty, { grade: 'Assistant Professor', examType: 'Internal Test 1', count: '' }]);
    };

    const updateStaffDuty = (index, field, value) => {
        const updated = [...staffGradeDuty];
        updated[index][field] = value;
        setStaffGradeDuty(updated);
    };

    const handleStaffDutyUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/update-staff-duty-counts/', 
                { duties: staffGradeDuty }, 
                { headers: { 'Authorization': `Token ${token}` }}
            );
            alert("Staff Duty Counts updated based on Grade and Exam Type!");
        } catch (err) {
            alert("Error updating staff duty counts.");
        }
    };

    const handleExamSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...examBase, schedules: examEntries };
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/insert-exam/', payload, {
                headers: { 'Authorization': `Token ${token}` }
            });
            alert("Exam Schedule Saved!");
            setExamEntries([{ dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
            fetchSchedules(); 
        } catch (err) { alert("Error saving exam schedule."); }
    };

    return (
        <div className="tab-section">
            {/* --- SECTION 1: STAFF DUTY REQUIREMENTS (WITH EXAM TYPE) --- */}
            <div className="staff-duty-section" style={{ background: '#fff9e6', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #ffeeba' }}>
                <h3 style={{ marginTop: 0, color: '#856404' }}>Staff Duty Settings</h3>
                <p style={{ fontSize: '13px', color: '#666' }}>Set duty counts per grade for specific exam types (e.g., Assistant Prof - Internal: 2, Regular: 3).</p>
                
                <form onSubmit={handleStaffDutyUpdate}>
                    {staffGradeDuty.map((duty, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <select 
                                style={{ flex: 1.5, padding: '10px' }} 
                                value={duty.grade} 
                                onChange={e => updateStaffDuty(index, 'grade', e.target.value)}
                            >
                                <option value="Assistant Professor">Assistant Professor</option>
                                <option value="Associate Professor">Associate Professor</option>
                                <option value="Professor">Professor</option>
                                <option value="Lab Assistant">Lab Assistant</option>
                            </select>

                            <select 
                                style={{ flex: 1.5, padding: '10px' }} 
                                value={duty.examType} 
                                onChange={e => updateStaffDuty(index, 'examType', e.target.value)}
                            >
                                <option value="Internal Test 1">Internal Test 1</option>
                                <option value="Internal Test 2">Internal Test 2</option>
                                <option value="Regular Exam">Regular Exam</option>
                            </select>

                            <input 
                                type="number" 
                                placeholder="Duty Count" 
                                style={{ flex: 1, padding: '10px' }} 
                                value={duty.count} 
                                onChange={e => updateStaffDuty(index, 'count', e.target.value)}
                                required
                            />
                            {staffGradeDuty.length > 1 && (
                                <button type="button" onClick={() => setStaffGradeDuty(staffGradeDuty.filter((_, i) => i !== index))} style={{background: '#ff4d4d', color: 'white', border: 'none', padding: '10px', borderRadius: '4px'}}>×</button>
                            )}
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={addStaffGrade} style={{ background: '#f1c40f', border: 'none', padding: '10px 15px', borderRadius: '4px', fontWeight: 'bold' }}>+ Add Requirement</button>
                        <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold' }}>Save Duty Rules</button>
                    </div>
                </form>
            </div>

            <hr style={{ margin: '30px 0', border: '0.5px solid #eee' }} />

            {/* --- SECTION 2: EXAM SCHEDULE MANAGEMENT --- */}
            <h3>Create New Exam Schedule</h3>
            <form className="admin-form" onSubmit={handleExamSubmit}>
                <div className="global-selection-box" style={{ background: '#f0f4f8', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #d1d9e6' }}>
                    <div className="form-row" style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Date</label>
                            <input type="date" style={{ width: '100%', padding: '8px' }} value={examBase.date} onChange={e => setExamBase({...examBase, date: e.target.value})} required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Session</label>
                            <select style={{ width: '100%', padding: '8px' }} value={examBase.session} onChange={e => setExamBase({...examBase, session: e.target.value})} required>
                                <option value="">Select Session</option>
                                <option value="FN">FN</option>
                                <option value="AN">AN</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Exam Type</label>
                            <select style={{ width: '100%', padding: '8px' }} value={examBase.examType} onChange={e => setExamBase({...examBase, examType: e.target.value})} required>
                                <option value="Internal Test 1">Internal Test 1</option>
                                <option value="Internal Test 2">Internal Test 2</option>
                                <option value="Regular Exam">Regular Exam</option>
                            </select>
                        </div>
                    </div>
                </div>

                {examEntries.map((entry, index) => (
                    <div key={index} style={{ background: '#fff', border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
                        <div className="form-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select value={entry.dept} onChange={e => updateEntry(index, 'dept', e.target.value)}>
                                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                            <select value={entry.branch} onChange={e => updateEntry(index, 'branch', e.target.value)} required>
                                <option value="">Select Branch</option>
                                {renderBranchOptions(entry.dept)}
                            </select>
                            <select value={entry.sem} onChange={e => updateEntry(index, 'sem', e.target.value)} required>
                                <option value="">Select Semester</option>
                                {renderSemesterOptions(entry.dept, entry.branch)}
                            </select>
                            <input style={{ flex: 1, padding: '8px' }} type="text" value={entry.subject} onChange={e => updateEntry(index, 'subject', e.target.value)} placeholder="Subject Name" required />
                            {examEntries.length > 1 && (
                                <button type="button" onClick={() => setExamEntries(examEntries.filter((_, i) => i !== index))} style={{background: '#ff4d4d', color: 'white', border: 'none', padding: '8px', borderRadius: '4px'}}>Remove</button>
                            )}
                        </div>
                    </div>
                ))}
                
                <div style={{ marginTop: '15px' }}>
                    <button type="button" onClick={addMoreExamEntry} style={{ padding: '8px 15px' }}>+ Add Subject</button>
                    <button type="submit" className="btn-primary" style={{ marginLeft: '10px', padding: '8px 15px' }}>Save Schedule</button>
                </div>
            </form>

            <hr style={{ margin: '40px 0', border: '0.5px solid #eee' }} />

            {/* --- SECTION 3: DISPLAY SAVED DATA --- */}
            <div className="display-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Saved Exam Schedules</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: '6px' }} />
                        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ padding: '6px' }}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? <p>Loading...</p> : (
                    <div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                            <thead>
                                <tr style={{ background: '#34495e', color: 'white', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>Date / Day</th>
                                    <th style={{ padding: '12px' }}>Type / Session</th>
                                    <th style={{ padding: '12px' }}>Course & Subject</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSchedules.map((item, idx) => (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '12px' }}>
                                            <strong>{item.date}</strong><br/>
                                            <small style={{ color: '#2980b9' }}>{getDayName(item.date)}</small>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ fontSize: '11px', background: '#e8f4fd', padding: '3px 7px', borderRadius: '4px' }}>
                                                {item.exam_type || 'N/A'}
                                            </span><br/>
                                            <small>{item.session}</small>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <strong>{item.course_name}</strong><br/>
                                            <span style={{ color: '#666' }}>{item.subject}</span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => window.confirm("Delete?") && handleDeleteSchedule(item.id)}
                                                style={{ background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamSchedule;