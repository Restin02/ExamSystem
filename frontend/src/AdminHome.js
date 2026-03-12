import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Admin.css';

// Import Sub-components
import StaffManagement from './components/StaffManagement';
import StaffDetailsView from './components/StaffDetailsView';
import StaffTimetable from './components/StaffTimetable';
import ClassroomSetup from './components/ClassroomSetup';
import ExamSchedule from './components/ExamSchedule';
import DeptSettings from './components/DeptSettings';

const AdminHome = () => {
    const [activeTab, setActiveTab] = useState('staff');
    const [staffList, setStaffList] = useState([]);
    const [roomList, setRoomList] = useState([]);
    const token = localStorage.getItem('token');

    const [departments, setDepartments] = useState([
        { 
            name: 'B.Tech', 
            branches: [
                { name: 'Computer Engineering', semCount: 8 },
                { name: 'Mechanical Engineering', semCount: 8 },
                { name: 'Electronics & Communication', semCount: 8 }
            ] 
        },
        { 
            name: 'MCA', 
            branches: [
                { name: 'MCA', semCount: 4 },
                { name: 'IMCA', semCount: 10 }
            ] 
        }
    ]);

    // FIXED SYNTAX: Removed the extra ")" and used a direct window redirect
    const handleLogout = useCallback(() => {
        localStorage.clear(); 
        window.location.href = '/login'; 
    }, []);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const config = { headers: { 'Authorization': `Token ${token}` } };
            const staffRes = await axios.get('http://127.0.0.1:8000/api/admin/get-all-staff/', config);
            setStaffList(staffRes.data);
            const roomRes = await axios.get('http://127.0.0.1:8000/api/admin/get-rooms/', config);
            setRoomList(roomRes.data);
        } catch (err) {
            // If the token is dead, log out automatically
            if (err.response?.status === 401) handleLogout();
        }
    }, [token, handleLogout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Dropdown Helpers
    const renderBranchOptions = (deptName) => {
        const dept = departments.find(d => d.name === deptName);
        return dept ? dept.branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>) : <option>Select Dept</option>;
    };

    const renderSemesterOptions = (deptName, branchName) => {
        const dept = departments.find(d => d.name === deptName);
        const branch = dept?.branches.find(b => b.name === branchName);
        if (!branch) return <option>Select Branch</option>;
        const sems = [];
        for (let i = 1; i <= branch.semCount; i++) sems.push(`S${i}`);
        return sems.map(s => <option key={s} value={s}>{s}</option>);
    };

    return (
        <div className="admin-dashboard">
            <nav className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ padding: '20px' }}>Admin Portal</h2>
                    <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff Management</button>
                    <button className={activeTab === 'view-details' ? 'active' : ''} onClick={() => setActiveTab('view-details')}>Staff Details View</button>
                    <button className={activeTab === 'timetable' ? 'active' : ''} onClick={() => setActiveTab('timetable')}>Staff Timetable</button>
                    <button className={activeTab === 'room' ? 'active' : ''} onClick={() => setActiveTab('room')}>Classroom Setup</button>
                    <button className={activeTab === 'exam' ? 'active' : ''} onClick={() => setActiveTab('exam')}>Exam Schedule</button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Dept Settings</button>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #444' }}>
                    <button 
                        onClick={handleLogout} 
                        style={{ width: '100%', padding: '12px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="admin-main-content">
                {activeTab === 'staff' && <StaffManagement staffList={staffList} departments={departments} token={token} fetchData={fetchData} renderBranchOptions={renderBranchOptions} />}
                {activeTab === 'view-details' && <StaffDetailsView staffList={staffList} token={token} />}
                {activeTab === 'timetable' && <StaffTimetable staffList={staffList} departments={departments} token={token} />}
                {activeTab === 'room' && <ClassroomSetup roomList={roomList} token={token} fetchData={fetchData} />}
                {activeTab === 'exam' && <ExamSchedule departments={departments} token={token} renderBranchOptions={renderBranchOptions} renderSemesterOptions={renderSemesterOptions} />}
                {activeTab === 'settings' && <DeptSettings departments={departments} setDepartments={setDepartments} />}
            </div>
        </div>
    );
};

export default AdminHome;