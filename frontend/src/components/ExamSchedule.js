import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ExamSchedule = ({ departments, token, renderBranchOptions, renderSemesterOptions }) => {
    // 1. State Definitions
    const [examBase, setExamBase] = useState({ date: '', session: '', examType: '' });
    const [examEntries, setExamEntries] = useState([{ dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
    const [savedSchedules, setSavedSchedules] = useState([]); // This is your main data source
    const [loading, setLoading] = useState(true);

    const [filterDate, setFilterDate] = useState('');
    const [filterDept, setFilterDept] = useState('');

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

    // 3. Delete Handler (Fixed the setScheduledExams error)
    const handleDeleteSchedule = async (id) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/admin/delete-exam-schedule/${id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });

            // CORRECTED: Use setSavedSchedules instead of setScheduledExams
            setSavedSchedules(prev => prev.filter(exam => exam.id !== id));
            
            alert("Exam schedule deleted successfully!");
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete. Please ensure the backend route exists.");
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

    const handleExamSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...examBase, schedules: examEntries };
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/insert-exam/', payload, {
                headers: { 'Authorization': `Token ${token}` }
            });
            alert("Exam Schedule Saved Successfully!");
            setExamEntries([{ dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
            fetchSchedules(); 
        } catch (err) { 
            alert("Error saving exam schedule."); 
        }
    };

    return (
        <div className="tab-section">
            <h3>Exam Schedule Management</h3>
            
            {/* --- ADD EXAM FORM --- */}
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
                                <option value="FN">FN (Forenoon)</option>
                                <option value="AN">AN (Afternoon)</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Exam Type</label>
                            <select style={{ width: '100%', padding: '8px' }} value={examBase.examType} onChange={e => setExamBase({...examBase, examType: e.target.value})} required>
                                <option value="">Select Exam Type</option>
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
                                {renderSemesterOptions(entry.dept, entry.branch)}
                            </select>
                            <input style={{ flex: 1, padding: '8px' }} type="text" value={entry.subject} onChange={e => updateEntry(index, 'subject', e.target.value)} placeholder="Subject Name" required />
                            {examEntries.length > 1 && (
                                <button type="button" onClick={() => setExamEntries(examEntries.filter((_, i) => i !== index))} style={{background: '#ff4d4d', color: 'white', border: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px'}}>Remove</button>
                            )}
                        </div>
                    </div>
                ))}
                
                <div style={{ marginTop: '15px' }}>
                    <button type="button" onClick={addMoreExamEntry} style={{ padding: '8px 15px', cursor: 'pointer' }}>+ Add More Subjects</button>
                    <button type="submit" className="btn-primary" style={{ marginLeft: '10px', padding: '8px 15px', cursor: 'pointer' }}>Save All Schedules</button>
                </div>
            </form>

            <hr style={{ margin: '40px 0', border: '0.5px solid #eee' }} />

            {/* --- VIEW SECTION --- */}
            <div className="display-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0' }}>Scheduled Exams (Database)</h3>
                        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Filter results by date or department</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', background: '#eef2f7', padding: '15px', borderRadius: '8px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Filter by Date</label>
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Filter by Dept</label>
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', background: 'white' }}>
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { setFilterDate(''); setFilterDept(''); }} style={{ padding: '7px 12px', fontSize: '12px', cursor: 'pointer', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px' }}>Reset</button>
                    </div>
                </div>

                {loading ? (
                    <p>Loading schedules...</p>
                ) : filteredSchedules.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>No exams found matching your filters.</p>
                ) : (
                    <div className="table-responsive" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                            <thead>
                                <tr style={{ background: '#34495e', color: 'white', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', border: '1px solid #eee' }}>Date & Session</th>
                                    <th style={{ padding: '12px', border: '1px solid #eee' }}>Exam Category</th>
                                    <th style={{ padding: '12px', border: '1px solid #eee' }}>Courses & Subjects</th>
                                    <th style={{ padding: '12px', border: '1px solid #eee', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSchedules.map((item, idx) => (
                                    <tr key={item.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                                        <td style={{ padding: '12px', border: '1px solid #eee' }}>
                                            <strong>{item.date}</strong> <br />
                                            <small style={{ color: '#555' }}>{item.session || item.time_slot?.split('-')[0]}</small>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #eee' }}>
                                            <span style={{ fontSize: '11px', background: '#dff9fb', color: '#0984e3', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                {item.time_slot}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #eee' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.course_name}</div>
                                            <div style={{ fontSize: '13px', color: '#7f8c8d' }}>{item.subject}</div>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #eee', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm("Are you sure?")) handleDeleteSchedule(item.id);
                                                }}
                                                style={{ padding: '6px 12px', background: '#ffefef', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', cursor: 'pointer' }}
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