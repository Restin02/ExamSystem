import React, { useState } from 'react';
import axios from 'axios';

const StaffDutyAllocation = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [availableStaff, setAvailableStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAllocatedStaff = async () => {
        if (!startDate || !endDate) {
            alert("Please select both Start and End dates");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://127.0.0.1:8000/api/admin/get-allocated-duties/`, {
                params: { start: startDate, end: endDate },
                headers: { 'Authorization': `Token ${token}` }
            });
            setAvailableStaff(res.data.allocated_staff);
        } catch (err) {
            alert("Error fetching allocation list.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tab-section">
            <h3>Automated Staff Duty View</h3>
            
            <div className="admin-form" style={{ display: 'flex', gap: '20px', padding: '20px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
                <div>
                    <label>Start Date:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label>End Date:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button className="btn-primary" style={{ alignSelf: 'flex-end' }} onClick={fetchAllocatedStaff}>
                    View Allocated Staff
                </button>
            </div>

            <div className="results-section" style={{ marginTop: '20px' }}>
                {loading ? <p>Loading Allocation Map...</p> : (
                    <table className="admin-table" style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee' }}>
                                <th>Staff Name</th>
                                <th>Date</th>
                                <th>Session</th>
                                <th>Auto-Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableStaff.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.name}</td>
                                    <td>{item.date}</td>
                                    <td>{item.session}</td>
                                    <td><span className="status-tag available">AUTO-ALLOCATED</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default StaffDutyAllocation;