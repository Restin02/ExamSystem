import React, { useState } from 'react';
import axios from 'axios';

const StaffManagement = ({ staffList, departments, token, fetchData, renderBranchOptions }) => {
    const [staffForm, setStaffForm] = useState({
        username: '', name: '', email: '', grade: 'Assistant Professor',
        department: 'B.Tech', branch: '', phone_number: ''
    });

    const handleStaffInsert = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://127.0.0.1:8000/api/admin/insert-staff/', staffForm, {
                headers: { 'Authorization': `Token ${token}` }
            });
            alert("Staff Registered successfully!");
            fetchData(); 
        } catch (err) { alert("Error: " + (err.response?.data?.error || "Registration failed")); }
    };

    const handleRemoveStaff = async (username) => {
        if (window.confirm(`Are you sure you want to remove staff: ${username}?`)) {
            try {
                await axios.delete(`http://127.0.0.1:8000/api/admin/delete-staff/${username}/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                alert("Staff removed successfully");
                fetchData();
            } catch (err) { alert("Error deleting staff"); }
        }
    };

    return (
        <div className="tab-section">
            <h3>Staff Enrollment</h3>
            <form className="admin-form" onSubmit={handleStaffInsert}>
                <div className="form-row">
                    <div><label>Username</label><input type="text" value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})} required /></div>
                    <div><label>Email</label><input type="email" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} required /></div>
                </div>
                <div className="form-row">
                    <div><label>Full Name</label><input type="text" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} required /></div>
                    <div><label>Phone</label><input type="text" maxLength="10" value={staffForm.phone_number} onChange={e => setStaffForm({...staffForm, phone_number: e.target.value.replace(/\D/g, '')})} required /></div>
                </div>
                <div className="form-row">
                    <div><label>Staff Grade</label>
                        <select className="form-control" value={staffForm.grade} onChange={(e) => setStaffForm({...staffForm, grade: e.target.value})} required>
                            <option value="Professor">Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Assistant Professor">Assistant Professor</option>
                        </select></div>
                    <div><label>Department</label>
                        <select value={staffForm.department} onChange={e => setStaffForm({...staffForm, department: e.target.value, branch: ''})}>
                            {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select></div>
                </div>
                <div className="form-row">
                    <div><label>Branch</label>
                        <select value={staffForm.branch} onChange={e => setStaffForm({...staffForm, branch: e.target.value})} required>
                            {renderBranchOptions(staffForm.department)}
                        </select> </div>
                </div>
                <button type="submit" className="btn-primary">Register Staff</button>
            </form>
            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>Name</th><th>Dept</th><th>Branch</th><th>Action</th></tr></thead>
                    <tbody>
                        {staffList.map(s => (
                            <tr key={s.id}>
                                <td>{s.name}</td><td>{s.department}</td><td>{s.branch}</td>
                                <td><button className="btn-secondary" style={{ backgroundColor: '#ff4d4d', color: 'white' }} onClick={() => handleRemoveStaff(s.username)}>Delete</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default StaffManagement;