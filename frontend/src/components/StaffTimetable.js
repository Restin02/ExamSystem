import React, { useState } from 'react';
import axios from 'axios';

const StaffTimetable = ({ staffList, departments, token }) => {
    const [selectedStaff, setSelectedStaff] = useState('');
    const [timetable, setTimetable] = useState(
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({ day, periods: Array(6).fill('') }))
    );

    const getTimetableOptions = () => {
        const options = [];
        departments.forEach(dept => {
            dept.branches.forEach(branch => {
                for (let i = 1; i <= branch.semCount; i++) options.push(`${branch.name} S${i}`);
            });
        });
        return options;
    };

    const handleCellChange = (dayIndex, periodIndex, value) => {
        const newTimetable = [...timetable];
        newTimetable[dayIndex].periods[periodIndex] = value;
        setTimetable(newTimetable);
    };

    const handleTimetableSubmit = async () => {
        if (!selectedStaff) return alert("Please select a staff member");
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/save-timetable/', {
                staff_username: selectedStaff, schedule: timetable
            }, { headers: { 'Authorization': `Token ${token}` } });
            alert("Staff Timetable Updated!");
        } catch (err) { alert("Error saving timetable"); }
    };

    return (
        <div className="tab-section">
            <h3>Assign Weekly Timetable</h3>
            <div className="admin-form">
                <label>Select Staff Member</label>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                    <option value="">-- Choose Staff --</option>
                    {staffList.map(s => <option key={s.id} value={s.username}>{s.name} ({s.username})</option>)}
                </select>
                {selectedStaff && (
                    <div className="timetable-grid-container">
                        <table className="timetable-grid">
                            <thead><tr><th>Day</th>{[1,2,3,4,5,6].map(p => <th key={p}>P{p}</th>)}</tr></thead>
                            <tbody>
                                {timetable.map((row, dIdx) => (
                                    <tr key={row.day}>
                                        <td className="day-label">{row.day}</td>
                                        {row.periods.map((p, pIdx) => (
                                            <td key={pIdx}>
                                                <select className="period-select" value={p} onChange={(e) => handleCellChange(dIdx, pIdx, e.target.value)}>
                                                    <option value="">--</option>
                                                    {getTimetableOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={handleTimetableSubmit}>Save Timetable</button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default StaffTimetable;