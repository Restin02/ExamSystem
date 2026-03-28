import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ExamSchedule = ({ departments, token, renderBranchOptions, renderSemesterOptions }) => {
    // 1. State Definitions
    const [examBase, setExamBase] = useState({ date: '', session: '', examType: 'Internal Test 1' });
    const [examEntries, setExamEntries] = useState([{ dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
    const [staffGradeDuty, setStaffGradeDuty] = useState([{ grade: 'Assistant Professor', examType: 'Internal Test 1', count: '2' }]);
    const [savedSchedules, setSavedSchedules] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [filterDept, setFilterDept] = useState('');

    // --- UTILITY: Formatting & Styling ---
    const getExamTypeStyles = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('internal')) return { color: '#4a5568', bg: '#f1f5f9', border: '#cbd5e1' };
        if (t.includes('regular')) return { color: '#166534', bg: '#dcfce7', border: '#bbf7d0' };
        return { color: '#718096', bg: '#f8fafc', border: '#e2e8f0' };
    };

    const formatDateParts = (dateStr) => {
        if (!dateStr) return { dayName: '', dateNum: '' };
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase(),
            dateNum: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
    };

    // --- FETCH DATA ---
    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/admin/get-exams/', {
                headers: { 'Authorization': `Token ${token}` }
            });
            setSavedSchedules(res.data);
        } catch (err) {
            console.error("Error fetching schedules:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    // --- HANDLERS ---
    
    // UPDATED: key changed from 'rules' to 'duties' to match Django request.data.get('duties')
    const saveStaffSettings = async () => {
        if (!window.confirm("This will overwrite existing duty counts for all staff in these grades. Continue?")) return;
        try {
            setLoading(true);
            await axios.post('http://127.0.0.1:8000/api/admin/update-staff-duty-counts/', 
                { duties: staffGradeDuty }, 
                { headers: { 'Authorization': `Token ${token}` } }
            );
            alert("Staff duty counts updated successfully!");
        } catch (err) {
            alert("Failed to update staff counts. Check console for details.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleExamSubmit = async (e) => {
    e.preventDefault();
    try {
        const payload = { 
            date: examBase.date,
            session: examBase.session,
            exam_type: examBase.examType, // Changed from examType to exam_type
            schedules: examEntries 
        };
        
        await axios.post('http://127.0.0.1:8000/api/admin/insert-exam/', payload, {
            headers: { 'Authorization': `Token ${token}` }
        });
        alert("Exam Schedule Saved!");
        fetchSchedules(); 
    } catch (err) { 
        alert("Error saving."); 
    }
};

    const handleDeleteSchedule = async (id) => {
    // Updated confirmation message to remove "refund" mention
    if (window.confirm("Are you sure you want to delete this schedule?")) {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/admin/delete-exam-schedule/${id}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            
            // Remove from local state immediately for UI responsiveness
            setSavedSchedules(prev => prev.filter(exam => exam.id !== id));
            alert("Schedule deleted.");
        } catch (err) { 
            alert("Failed to delete schedule."); 
            console.error(err);
        }
    }
};

    // Helpers for dynamic rows
    const addMoreExamEntry = () => setExamEntries([...examEntries, { dept: 'B.Tech', branch: '', sem: 'S1', subject: '' }]);
    const updateEntry = (idx, f, v) => { const u = [...examEntries]; u[idx][f] = v; setExamEntries(u); };
    const addStaffGrade = () => setStaffGradeDuty([...staffGradeDuty, { grade: 'Assistant Professor', examType: 'Internal Test 1', count: '' }]);
    const updateStaffDuty = (idx, f, v) => { const u = [...staffGradeDuty]; u[idx][f] = v; setStaffGradeDuty(u); };

    // --- SORTING & FILTERING ---
    const processedSchedules = useMemo(() => {
        return [...savedSchedules]
            .filter(item => {
                const matchesDate = filterDate === '' || item.date === filterDate;
                const matchesDept = filterDept === '' || (item.course_name && item.course_name.toLowerCase().includes(filterDept.toLowerCase()));
                return matchesDate && matchesDept;
            })
            .sort((a, b) => {
                const dateDiff = new Date(a.date) - new Date(b.date);
                if (dateDiff !== 0) return dateDiff;
                return b.session.localeCompare(a.session);
            });
    }, [savedSchedules, filterDate, filterDept]);

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(18);
        doc.text("EXAM SCHEDULE REPORT", 148, 15, { align: "center" });
        const tableColumn = ["Date", "Day", "Exam Type", "Session", "Course/Branch", "Subject"];
        const tableRows = processedSchedules.map(item => {
            const { dayName, dateNum } = formatDateParts(item.date);
            return [dateNum, dayName, item.exam_type, item.session, item.course_name, item.subject];
        });
        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 25, theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' }, styles: { fontSize: 9 }
        });
        doc.save(`Exam_Schedule_${new Date().toLocaleDateString()}.pdf`);
    };

    return (
        <div className="tab-section" style={{ padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* SECTION 1: STAFF DUTY SETTINGS */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>⚙️ Staff Duty Settings</h3>
                    <button 
                        type="button" 
                        onClick={saveStaffSettings} 
                        className="btn-save" 
                        style={{ background: '#059669', color: 'white', padding: '8px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Update Staff Counts
                    </button>
                </div>
                
                {staffGradeDuty.map((duty, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <select className="admin-select" style={{ flex: 1 }} value={duty.grade} onChange={e => updateStaffDuty(index, 'grade', e.target.value)}>
                            <option value="Assistant Professor">Assistant Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Professor">Professor</option>
                        </select>
                        <select className="admin-select" style={{ flex: 1 }} value={duty.examType} onChange={e => updateStaffDuty(index, 'examType', e.target.value)}>
                            <option value="Internal Test 1">Internal Test 1</option>
                            <option value="Internal Test 2">Internal Test 2</option>
                            <option value="Regular Exam">Regular Exam</option>
                        </select>
                        <input type="number" className="admin-input" style={{ width: '100px' }} placeholder="Count" value={duty.count} onChange={e => updateStaffDuty(index, 'count', e.target.value)} />
                        <button type="button" onClick={() => setStaffGradeDuty(staffGradeDuty.filter((_, i) => i !== index))} className="btn-delete-outline">×</button>
                    </div>
                ))}
                <button type="button" onClick={addStaffGrade} style={{ background: '#64748b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>+ Add Rule Row</button>
            </div>

            {/* SECTION 2: CREATE SCHEDULE */}
            <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <h3 style={{ color: '#1e293b', marginBottom: '20px' }}>📅 Create New Exam Schedule</h3>
                <form onSubmit={handleExamSubmit}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '11px', fontWeight: '800' }}>DATE</label>
                            <input type="date" className="admin-input" value={examBase.date} onChange={e => setExamBase({...examBase, date: e.target.value})} required />
                        </div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '11px', fontWeight: '800' }}>SESSION</label>
                            <select className="admin-select" value={examBase.session} onChange={e => setExamBase({...examBase, session: e.target.value})} required>
                                <option value="">Select</option><option value="FN">FN</option><option value="AN">AN</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}><label style={{ fontSize: '11px', fontWeight: '800' }}>EXAM TYPE</label>
                            <select className="admin-select" value={examBase.examType} onChange={e => setExamBase({...examBase, examType: e.target.value})} required>
                                <option value="Internal Test 1">Internal Test 1</option><option value="Internal Test 2">Internal Test 2</option><option value="Regular Exam">Regular Exam</option>
                            </select>
                        </div>
                    </div>

                    {examEntries.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <select className="admin-select" style={{ width: '120px' }} value={entry.dept} onChange={e => updateEntry(index, 'dept', e.target.value)}>
                                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                            <select className="admin-select" style={{ flex: 1 }} value={entry.branch} onChange={e => updateEntry(index, 'branch', e.target.value)} required>
                                <option value="">Branch</option>{renderBranchOptions(entry.dept)}
                            </select>
                            <select className="admin-select" style={{ width: '100px' }} value={entry.sem} onChange={e => updateEntry(index, 'sem', e.target.value)} required>
                                <option value="">Sem</option>{renderSemesterOptions(entry.dept, entry.branch)}
                            </select>
                            <input className="admin-input" style={{ flex: 2 }} type="text" value={entry.subject} onChange={e => updateEntry(index, 'subject', e.target.value)} placeholder="Subject Name" required />
                            <button type="button" onClick={() => setExamEntries(examEntries.filter((_, i) => i !== index))} className="btn-delete-outline">Remove</button>
                        </div>
                    ))}
                    <div style={{ marginTop: '15px' }}>
                        <button type="button" onClick={addMoreExamEntry} className="btn-save" style={{ background: '#94a3b8', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ Add Subject</button>
                        <button type="submit" className="btn-save" style={{ marginLeft: '10px', background: '#2d3748', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Schedule</button>
                    </div>
                </form>
            </div>

            {/* SECTION 3: DISPLAY LIST */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ color: '#1e293b', fontWeight: '800' }}>Saved Exam Schedules</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select className="admin-select" style={{ width: '150px' }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                        <input type="date" className="admin-input" style={{ width: '150px' }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                        <button onClick={generatePDF} style={{ padding: '8px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Download PDF</button>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#334155', color: 'white' }}>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Date & Day</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Type & Session</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Course Details</th>
                                <th style={{ padding: '15px', textAlign: 'left' }}>Subject</th>
                                <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr> : 
                             processedSchedules.map((item, idx) => {
                                const { dayName, dateNum } = formatDateParts(item.date);
                                const typeStyle = getExamTypeStyles(item.exam_type);
                                return (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #edf2f7', backgroundColor: item.session === 'FN' ? '#fff' : '#fcfcfc' }}>
                                        <td style={{ padding: '15px', borderLeft: item.session === 'FN' ? '4px solid #2563eb' : '4px solid #d97706' }}>
                                            <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '13px' }}>{dayName}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{dateNum}</div>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', backgroundColor: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, marginBottom: '5px' }}>
                                                {item.exam_type}
                                            </span><br/>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: item.session === 'FN' ? '#2563eb' : '#d97706' }}>{item.session}</span>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{item.course_name}</div>
                                        </td>
                                        <td style={{ padding: '15px', color: '#475569', fontSize: '13px' }}>{item.subject}</td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleDeleteSchedule(item.id)} className="btn-delete-outline" style={{ fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExamSchedule;